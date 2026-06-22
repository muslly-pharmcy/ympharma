// Phase 4C + 6D — WhatsApp AI Agent
// Server-only. Never imported from client modules.
//
// READ-ONLY tools (executed directly):
//   - search_products             → ai_search_products
//   - get_order_status            → ai_get_order_status        (phone-locked)
//   - get_prescription_status     → ai_get_prescription_status (phone-locked)
//   - get_branch_availability     → ai_get_branch_availability
//   - list_branches               → ai_list_branches
//   - escalate                    → opens whatsapp_escalations
//
// FORBIDDEN actions (guard tools — never execute, only enqueue approval):
//   - create_order
//   - approve_prescription
//   - inventory_change
//   - transfer
//   - price_change
//   - refund
//
// When the model calls a forbidden tool, we insert a row in
// `agent_approval_requests` (status='pending'), raise a staff_alert, and
// return a polite Arabic message + force escalation so a human can act.
//
// Every turn carries a `correlation_id` written into ai_tool_events and
// agent_approval_requests so an auditor can replay the full conversation.

import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SYSTEM_PROMPT = `أنت موظف خدمة عملاء صيدلية المصلي في عدن — تردّ عبر واتساب.
- ساعد العميل في: البحث عن المنتجات، حالة الطلبات، حالة الروشتة، توفر المنتج في الفروع.
- استخدم العربية الفصحى البسيطة. ردود قصيرة (أقل من 5 أسطر).
- لا تخترع أسعاراً أو منتجات أو حالات. استخدم الأدوات للحصول على بيانات فعلية فقط.
- لطلبات الإنشاء/التعديل/الإلغاء/الموافقة على روشتة/تعديل مخزون/تحويل بين فروع: استخدم أداة الموافقة المناسبة (request_*). هذه الأدوات لا تنفّذ مباشرة بل تطلب موافقة موظف بشري.
- لأي شك أو شكوى أو حالة طارئة — استخدم escalate.
- للتأمين: https://muslly.com/insurance — للروشتة: https://muslly.com/prescription — للتتبع: https://muslly.com/track
- لا تذكر أنك ذكاء اصطناعي. لا تكشف أسماء الأدوات الداخلية.`;

export type AgentMessage = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  reply: string;
  intent: string | null;
  escalated: boolean;
  correlationId: string;
  toolCalls: Array<{ name: string; ok: boolean; needsApproval?: boolean }>;
};

const FORBIDDEN_ACTIONS = [
  "create_order",
  "approve_prescription",
  "inventory_change",
  "transfer",
  "price_change",
  "refund",
] as const;

type ForbiddenAction = (typeof FORBIDDEN_ACTIONS)[number];

const FORBIDDEN_LABEL: Record<ForbiddenAction, string> = {
  create_order: "إنشاء طلب",
  approve_prescription: "الموافقة على روشتة",
  inventory_change: "تعديل المخزون",
  transfer: "تحويل بين الفروع",
  price_change: "تغيير سعر",
  refund: "استرجاع مبلغ",
};

export async function runWhatsAppAgent(args: {
  apiKey: string;
  conversationId: string;
  phone: string;
  history: AgentMessage[];
  incoming: string;
}): Promise<AgentResult> {
  const { apiKey, conversationId, phone, history, incoming } = args;
  const correlationId = randomUUID();
  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");

  const toolCalls: AgentResult["toolCalls"] = [];
  let escalated = false;
  let intent: string | null = null;

  async function audit(
    toolName: string,
    input: unknown,
    started: number,
    result: { status: "ok" | "error" | "denied" | "needs_approval"; summary?: unknown; error?: string },
  ) {
    try {
      const { error } = await supabaseAdmin.from("ai_tool_events").insert({
        agent_id: "whatsapp-ai",
        conversation_id: conversationId,
        correlation_id: correlationId,
        tool_name: toolName,
        input: (input ?? {}) as never,
        output_summary: (result.summary ?? {}) as never,
        user_phone: phone,
        status: result.status,
        duration_ms: Date.now() - started,
        error_message: result.error ?? null,
      } as never);
      if (error) throw error;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[wa-agent] audit insert failed", message);
      try {
        await supabaseAdmin.from("staff_alerts").insert({
          kind: "ai_audit_failure", severity: "error",
          title: "فشل تسجيل تدقيق أداة AI",
          body: `tool=${toolName} reason=${message.slice(0, 240)}`,
          entity_type: "ai_tool_event", entity_id: conversationId,
          payload: { tool: toolName, status: result.status, phone, error: message, correlation_id: correlationId },
        } as never);
      } catch (alertErr) {
        console.error("[wa-agent] audit failure alert also failed", alertErr);
      }
    }
  }

  /** Guard: insert an approval request + staff alert, never mutate business data. */
  async function enqueueApproval(action: ForbiddenAction, payload: Record<string, unknown>, reason: string) {
    const t0 = Date.now();
    intent = `request_${action}`;
    const customerMessage = `طلب العميل (${phone}): ${reason}`;
    let approvalId: string | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("agent_approval_requests")
        .insert({
          agent_id: "whatsapp-ai",
          conversation_id: conversationId,
          correlation_id: correlationId,
          user_phone: phone,
          action_type: action,
          payload: payload as never,
          customer_message: customerMessage,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      approvalId = (data as { id: string }).id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await audit(`request_${action}`, payload, t0, { status: "error", error: msg });
      toolCalls.push({ name: `request_${action}`, ok: false, needsApproval: true });
      return { ok: false as const, queued: false as const };
    }

    // Force escalation: a human MUST act.
    try {
      await supabaseAdmin.from("whatsapp_escalations").insert({
        conversation_id: conversationId,
        reason: `[${action}] ${reason}`.slice(0, 280),
      } as never);
      await supabaseAdmin
        .from("whatsapp_conversations")
        .update({ status: "escalated", last_intent: `request_${action}` } as never)
        .eq("id", conversationId);
      await supabaseAdmin.from("staff_alerts").insert({
        kind: "ai_approval_required",
        severity: "warn",
        title: `طلب موافقة: ${FORBIDDEN_LABEL[action]}`,
        body: `${phone} — ${reason}`.slice(0, 500),
        entity_type: "agent_approval_request",
        entity_id: approvalId,
        payload: { action, phone, reason, conversation_id: conversationId, correlation_id: correlationId, approval_id: approvalId },
      } as never);
    } catch (e) {
      console.error("[wa-agent] escalation side-effects failed", e);
    }
    escalated = true;
    toolCalls.push({ name: `request_${action}`, ok: true, needsApproval: true });
    await audit(`request_${action}`, payload, t0, {
      status: "needs_approval",
      summary: { approval_id: approvalId, action },
    });
    return { ok: true as const, queued: true as const, approvalId };
  }

  const tools = {
    // ===== READ-ONLY =====
    search_products: tool({
      description: "ابحث عن المنتجات بالاسم أو الفئة أو الماركة. يُرجع الاسم والسعر والتوفر.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(15).optional(),
      }),
      execute: async ({ query, limit }) => {
        const t0 = Date.now(); intent = "product_search";
        const { data, error } = await supabaseAdmin.rpc("ai_search_products", { _query: query, _limit: limit ?? 8 });
        toolCalls.push({ name: "search_products", ok: !error });
        if (error) { await audit("search_products", { query, limit }, t0, { status: "error", error: error.message }); return { error: "search_failed" }; }
        await audit("search_products", { query, limit }, t0, { status: "ok", summary: { count: (data ?? []).length } });
        return { results: data ?? [] };
      },
    }),

    get_order_status: tool({
      description: "اجلب حالة طلب باستخدام رقم الطلب. يتحقق من رقم جوال المرسِل.",
      inputSchema: z.object({ order_id: z.string().min(3) }),
      execute: async ({ order_id }) => {
        const t0 = Date.now(); intent = "order_status";
        const { data, error } = await supabaseAdmin.rpc("ai_get_order_status", { _order_id: order_id, _phone: phone });
        toolCalls.push({ name: "get_order_status", ok: !error });
        if (error) { await audit("get_order_status", { order_id }, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        const row = Array.isArray(data) ? data[0] : data;
        await audit("get_order_status", { order_id }, t0, { status: "ok", summary: { found: !!row, status: row?.status ?? null } });
        return row ? { found: true, order: row } : { found: false };
      },
    }),

    get_prescription_status: tool({
      description: "اجلب حالة روشتة باستخدام رقمها. مقيّد برقم جوال المرسِل.",
      inputSchema: z.object({ prescription_id: z.string().min(3) }),
      execute: async ({ prescription_id }) => {
        const t0 = Date.now(); intent = "prescription_status";
        const { data, error } = await supabaseAdmin.rpc("ai_get_prescription_status" as never, { _prescription_id: prescription_id, _phone: phone } as never);
        toolCalls.push({ name: "get_prescription_status", ok: !error });
        if (error) { await audit("get_prescription_status", { prescription_id }, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        const row = Array.isArray(data) ? data[0] : data;
        await audit("get_prescription_status", { prescription_id }, t0, { status: "ok", summary: { found: !!row, status: (row as { status?: string } | null)?.status ?? null } });
        return row ? { found: true, prescription: row } : { found: false };
      },
    }),

    get_branch_availability: tool({
      description: "أرجع توفر المنتج في كل فرع نشط بناءً على اسم/ماركة المنتج.",
      inputSchema: z.object({ product_query: z.string().min(2) }),
      execute: async ({ product_query }) => {
        const t0 = Date.now(); intent = "branch_availability";
        const { data, error } = await supabaseAdmin.rpc("ai_get_branch_availability" as never, { _product_query: product_query } as never);
        toolCalls.push({ name: "get_branch_availability", ok: !error });
        if (error) { await audit("get_branch_availability", { product_query }, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        const rows = (data ?? []) as unknown[];
        await audit("get_branch_availability", { product_query }, t0, { status: "ok", summary: { count: rows.length } });
        return { availability: rows };
      },
    }),

    list_branches: tool({
      description: "أرجع قائمة بفروع الصيدلية النشطة وعناوينها.",
      inputSchema: z.object({}),
      execute: async () => {
        const t0 = Date.now(); intent = "branches";
        const { data, error } = await supabaseAdmin.rpc("ai_list_branches");
        toolCalls.push({ name: "list_branches", ok: !error });
        if (error) { await audit("list_branches", {}, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        await audit("list_branches", {}, t0, { status: "ok", summary: { count: (data ?? []).length } });
        return { branches: data ?? [] };
      },
    }),

    check_stock: tool({
      description: "تحقق من توفر منتج بالاسم. يُرجع أعلى 3 منتجات مطابقة مرتبة تنازلياً حسب الكمية المتوفرة.",
      inputSchema: z.object({ product_name: z.string().min(1) }),
      execute: async ({ product_name }) => {
        const t0 = Date.now(); intent = "check_stock";
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, name, stock_qty, price_yer")
          .ilike("name", `%${product_name}%`)
          .order("stock_qty", { ascending: false })
          .limit(3);
        toolCalls.push({ name: "check_stock", ok: !error });
        if (error) { await audit("check_stock", { product_name }, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        await audit("check_stock", { product_name }, t0, { status: "ok", summary: { count: (data ?? []).length } });
        return { results: data ?? [] };
      },
    }),

    list_most_available: tool({
      description: "أرجع قائمة بأكثر المنتجات توفراً في المخزون (مرتبة تنازلياً حسب الكمية).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(15).optional() }),
      execute: async ({ limit }) => {
        const t0 = Date.now(); intent = "most_available";
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, name, stock_qty, price_yer")
          .order("stock_qty", { ascending: false })
          .limit(limit ?? 8);
        toolCalls.push({ name: "list_most_available", ok: !error });
        if (error) { await audit("list_most_available", { limit }, t0, { status: "error", error: error.message }); return { error: "lookup_failed" }; }
        await audit("list_most_available", { limit }, t0, { status: "ok", summary: { count: (data ?? []).length } });
        return { results: data ?? [] };
      },
    }),

    // ===== GUARD TOOLS — never execute, only enqueue approval =====
    request_create_order: tool({
      description: "اطلب من موظف بشري إنشاء طلب جديد للعميل. لا يُنفِّذ مباشرة.",
      inputSchema: z.object({
        items_summary: z.string().min(3).describe("وصف مختصر للأصناف"),
        delivery_address: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) =>
        enqueueApproval("create_order", input, `إنشاء طلب: ${input.items_summary}`),
    }),

    request_approve_prescription: tool({
      description: "اطلب موافقة صيدلي على روشتة. لا يُنفِّذ مباشرة.",
      inputSchema: z.object({ prescription_id: z.string().min(3), note: z.string().optional() }),
      execute: async (input) =>
        enqueueApproval("approve_prescription", input, `روشتة ${input.prescription_id}`),
    }),

    request_inventory_change: tool({
      description: "اطلب تعديل مخزون منتج. لا يُنفِّذ مباشرة.",
      inputSchema: z.object({
        product_query: z.string().min(2),
        delta: z.number().int(),
        reason: z.string().min(3),
      }),
      execute: async (input) =>
        enqueueApproval("inventory_change", input, `تعديل مخزون ${input.product_query} (${input.delta})`),
    }),

    request_transfer: tool({
      description: "اطلب تحويل منتجات بين فرعين. لا يُنفِّذ مباشرة.",
      inputSchema: z.object({
        source_branch: z.string(),
        destination_branch: z.string(),
        product_query: z.string(),
        qty: z.number().int().positive(),
      }),
      execute: async (input) =>
        enqueueApproval("transfer", input, `تحويل ${input.qty} من ${input.source_branch} إلى ${input.destination_branch}`),
    }),

    escalate: tool({
      description: "حوّل المحادثة لموظف بشري للحالات غير الواضحة أو الطارئة أو الشكاوى.",
      inputSchema: z.object({ reason: z.string().min(3).max(280) }),
      execute: async ({ reason }) => {
        const t0 = Date.now(); intent = "escalation";
        const { error: escErr } = await supabaseAdmin
          .from("whatsapp_escalations")
          .insert({ conversation_id: conversationId, reason } as never);
        if (escErr) {
          toolCalls.push({ name: "escalate", ok: false });
          await audit("escalate", { reason }, t0, { status: "error", error: escErr.message });
          return { ok: false };
        }
        await supabaseAdmin.from("whatsapp_conversations").update({ status: "escalated", last_intent: "escalation" } as never).eq("id", conversationId);
        await supabaseAdmin.from("staff_alerts").insert({
          kind: "whatsapp_escalation", severity: "warn",
          title: "تصعيد محادثة واتساب", body: `${phone}: ${reason}`,
          entity_type: "whatsapp_conversation", entity_id: conversationId,
          payload: { phone, reason, correlation_id: correlationId },
        } as never);
        escalated = true;
        toolCalls.push({ name: "escalate", ok: true });
        await audit("escalate", { reason }, t0, { status: "ok", summary: { escalated: true } });
        return { ok: true };
      },
    }),
  };

  const messages: AgentMessage[] = [...history.slice(-10), { role: "user", content: incoming }];

  try {
    const { text } = await generateText({
      model, system: SYSTEM_PROMPT, messages, tools,
      stopWhen: stepCountIs(50),
    });

    // If a guard fired, append a clear human-facing notice in case the model didn't.
    let reply = text?.trim() || "سيتم الرد عليك من قبل أحد الموظفين قريباً.";
    const approvalCall = toolCalls.find((c) => c.needsApproval);
    if (approvalCall && !/موظف|الإدارة|الصيدلي/i.test(reply)) {
      reply += "\n\nتم تحويل طلبك لموظف مختص للمراجعة والموافقة، وسنرد عليك قريباً.";
    }

    return { reply, intent, escalated, correlationId, toolCalls };
  } catch (err) {
    console.error("[wa-agent] generateText failed", err);
    return {
      reply: "نعتذر، حدث خطأ مؤقت. سيتواصل معك أحد الموظفين قريباً.",
      intent: "error", escalated: false, correlationId, toolCalls,
    };
  }
}
