// Phase 4C — WhatsApp AI Agent (read-only tools)
// Server-only. Never imported from client modules.
//
// Capabilities (READ-ONLY):
//   - search_products   → ai_search_products(query, limit)
//   - get_order_status  → ai_get_order_status(orderId, phone)  [phone-locked]
//   - list_branches     → ai_list_branches()
//   - escalate          → opens a whatsapp_escalations row (no inventory/order write)
//
// Deliberately NOT exposed: order creation, inventory mutation, price changes,
// transfers. Locked at the SQL layer (only service_role can EXECUTE the ai_*
// functions; products/orders are never updated by this path).

import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SYSTEM_PROMPT = `أنت موظف خدمة عملاء صيدلية المصلي في عدن — تردّ عبر واتساب.
- ساعد العميل في: البحث عن المنتجات، حالة الطلبات، معلومات الفروع، التأمين، رفع الروشتة.
- استخدم العربية الفصحى البسيطة. ردود قصيرة (أقل من 5 أسطر).
- لا تخترع أسعاراً أو منتجات أو حالات. استخدم الأدوات (tools) للحصول على البيانات الفعلية.
- إذا سأل عن حالة طلب: اطلب رقم الطلب ثم استخدم get_order_status (يتحقق من رقم الجوال تلقائياً).
- إذا طلب إنشاء طلب جديد، أو تعديل، أو إلغاء، أو شكوى، أو حالة طبية طارئة، أو لم تفهم — استخدم escalate وأبلغ العميل أن أحد الموظفين سيتواصل معه.
- للتأمين: https://muslly.com/insurance — للروشتة: https://muslly.com/prescription — للتتبع: https://muslly.com/track
- لا تذكر أنك ذكاء اصطناعي. لا تكشف أسماء الأدوات.`;

export type AgentMessage = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  reply: string;
  intent: string | null;
  escalated: boolean;
  toolCalls: Array<{ name: string; ok: boolean }>;
};

/**
 * Run one assistant turn for a conversation.
 * Caller is responsible for persisting the assistant reply as an outbound message.
 */
export async function runWhatsAppAgent(args: {
  apiKey: string;
  conversationId: string;
  phone: string;
  history: AgentMessage[];      // chronological, oldest first
  incoming: string;
}): Promise<AgentResult> {
  const { apiKey, conversationId, phone, history, incoming } = args;
  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");

  const toolCalls: AgentResult["toolCalls"] = [];
  let escalated = false;
  let intent: string | null = null;

  const tools = {
    search_products: tool({
      description:
        "ابحث عن المنتجات المتاحة في المتجر بالاسم أو الفئة أو الماركة. يُرجع الاسم والسعر والتوفر.",
      inputSchema: z.object({
        query: z.string().min(1).describe("كلمة البحث: اسم/فئة/ماركة"),
        limit: z.number().int().min(1).max(15).optional(),
      }),
      execute: async ({ query, limit }) => {
        intent = "product_search";
        const { data, error } = await supabaseAdmin.rpc("ai_search_products", {
          _query: query,
          _limit: limit ?? 8,
        });
        toolCalls.push({ name: "search_products", ok: !error });
        if (error) return { error: "search_failed" };
        return { results: data ?? [] };
      },
    }),

    get_order_status: tool({
      description:
        "اجلب حالة طلب باستخدام رقم الطلب. يتطلب تطابق رقم جوال المرسِل تلقائياً.",
      inputSchema: z.object({
        order_id: z.string().min(3).describe("رقم الطلب كما يظهر للعميل"),
      }),
      execute: async ({ order_id }) => {
        intent = "order_status";
        const { data, error } = await supabaseAdmin.rpc("ai_get_order_status", {
          _order_id: order_id,
          _phone: phone,
        });
        toolCalls.push({ name: "get_order_status", ok: !error });
        if (error) return { error: "lookup_failed" };
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return { found: false };
        return { found: true, order: row };
      },
    }),

    list_branches: tool({
      description: "أرجع قائمة بفروع الصيدلية النشطة وعناوينها.",
      inputSchema: z.object({}),
      execute: async () => {
        intent = "branches";
        const { data, error } = await supabaseAdmin.rpc("ai_list_branches");
        toolCalls.push({ name: "list_branches", ok: !error });
        if (error) return { error: "lookup_failed" };
        return { branches: data ?? [] };
      },
    }),

    escalate: tool({
      description:
        "حوّل المحادثة لموظف بشري. استخدمها للشكاوى، حالات الطوارئ، الطلبات غير الواضحة، أو طلبات إنشاء/تعديل طلب — لأن الـ AI لا يملك صلاحية الكتابة.",
      inputSchema: z.object({
        reason: z.string().min(3).max(280).describe("سبب التصعيد بإيجاز"),
      }),
      execute: async ({ reason }) => {
        intent = "escalation";
        const { error: escErr } = await supabaseAdmin
          .from("whatsapp_escalations")
          .insert({ conversation_id: conversationId, reason });
        if (escErr) {
          toolCalls.push({ name: "escalate", ok: false });
          return { ok: false };
        }
        await supabaseAdmin
          .from("whatsapp_conversations")
          .update({ status: "escalated", last_intent: "escalation" })
          .eq("id", conversationId);
        await supabaseAdmin.from("staff_alerts").insert({
          kind: "whatsapp_escalation",
          severity: "warn",
          title: "تصعيد محادثة واتساب",
          body: `${phone}: ${reason}`,
          entity_type: "whatsapp_conversation",
          entity_id: conversationId,
          payload: { phone, reason },
        });
        escalated = true;
        toolCalls.push({ name: "escalate", ok: true });
        return { ok: true };
      },
    }),
  };

  const messages: AgentMessage[] = [
    ...history.slice(-10),
    { role: "user", content: incoming },
  ];

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(8),
    });
    return {
      reply: text?.trim() || "سيتم الرد عليك من قبل أحد الموظفين قريباً.",
      intent,
      escalated,
      toolCalls,
    };
  } catch (err) {
    console.error("[wa-agent] generateText failed", err);
    return {
      reply: "نعتذر، حدث خطأ مؤقت. سيتواصل معك أحد الموظفين قريباً.",
      intent: "error",
      escalated: false,
      toolCalls,
    };
  }
}
