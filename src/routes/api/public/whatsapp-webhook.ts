import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runWhatsAppAgent, type AgentMessage } from "@/lib/whatsapp-ai-agent.server";

/**
 * WhatsApp Cloud API inbound webhook — Phase 4C.
 *
 *  Pipeline:
 *    Meta → verify signature → persist conversation/message
 *         → keyword shortcuts (insurance/greeting)
 *         → AI agent w/ read-only tools (search_products, order_status,
 *           list_branches, escalate)
 *         → send reply → persist outbound message → events auto-published
 *
 *  Idempotency:
 *    - wa_message_id has a UNIQUE index; duplicates from Meta retries are
 *      ignored (the insert errors and we exit early).
 *    - agent_events use ON CONFLICT DO NOTHING per (entity_id, event_name).
 *
 *  Setup in Meta:
 *    Callback:  https://muslly.com/api/public/whatsapp-webhook
 *    Verify:    WHATSAPP_VERIFY_TOKEN
 *    Subscribe: messages
 */

const KEYWORD_INSURANCE =
  /تأمين|تامين|insurance|بطاقة\s*التأمين|المتخصصة/i;
const KEYWORD_GREETING =
  /^\s*(مرحبا|مرحباً|السلام|hi|hello|بدء|start)/i;

async function sendText(phoneId: string, token: string, to: string, body: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: body.slice(0, 4000) },
        }),
      },
    );
    const json = (await res.json().catch(() => null)) as
      | { messages?: Array<{ id: string }>; error?: { message: string } }
      | null;
    return {
      ok: res.ok,
      wamid: json?.messages?.[0]?.id ?? null,
      error: json?.error?.message ?? (res.ok ? null : `http_${res.status}`),
    };
  } catch (e: unknown) {
    return { ok: false, wamid: null, error: (e as Error)?.message ?? "fetch_failed" };
  }
}

async function getOrCreateConversation(phone: string) {
  // Try to find any non-closed conversation first.
  const { data: existing } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("id, status")
    .eq("phone_number", phone)
    .neq("status", "closed")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .insert({ phone_number: phone, status: "active" })
    .select("id")
    .single();
  if (error || !created) {
    // Race: another insert won. Re-read.
    const { data: row } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("id")
      .eq("phone_number", phone)
      .neq("status", "closed")
      .limit(1)
      .single();
    return row?.id as string;
  }
  return created.id as string;
}

async function loadHistory(conversationId: string, limit = 10): Promise<AgentMessage[]> {
  const { data } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("direction, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).reverse();
  return rows
    .filter((r) => (r.content ?? "").trim().length > 0)
    .map((r) => ({
      role: r.direction === "inbound" ? "user" : "assistant",
      content: r.content as string,
    }));
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        const rawBody = await request.text();

        if (appSecret) {
          const sigHeader = request.headers.get("x-hub-signature-256") ?? "";
          const provided = sigHeader.startsWith("sha256=")
            ? sigHeader.slice(7)
            : sigHeader;
          const expected = createHmac("sha256", appSecret)
            .update(rawBody)
            .digest("hex");
          const a = Buffer.from(provided);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const apiToken = process.env.WHATSAPP_TOKEN;
        const aiKey = process.env.LOVABLE_API_KEY;

        let payload: unknown = null;
        try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* ignore */ }
        const entry = (payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string; from?: string; text?: { body?: string }; button?: { text?: string }; type?: string }>; statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ title?: string; message?: string }> }> }}>}> })
          ?.entry?.[0]?.changes?.[0]?.value;

        // Phase 6C — Meta delivery status callbacks (sent / delivered / read / failed).
        const statuses = entry?.statuses ?? [];
        if (statuses.length > 0) {
          for (const s of statuses) {
            if (!s?.id || !s?.status) continue;
            const nowIso = new Date().toISOString();
            const patch: Record<string, unknown> = { status: s.status };
            if (s.status === "delivered") patch.delivered_at = nowIso;
            else if (s.status === "read") patch.read_at = nowIso;
            else if (s.status === "failed") {
              patch.failed_at = nowIso;
              patch.error_message = s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "failed";
            }
            try {
              await supabaseAdmin.from("whatsapp_delivery_logs").update(patch as never).eq("wamid", s.id);
              await supabaseAdmin.from("whatsapp_messages").update({ status: s.status }).eq("wa_message_id", s.id);
            } catch (e) {
              console.error("[wa-webhook] status update failed", e);
            }
          }
          return Response.json({ ok: true, statuses: statuses.length });
        }

        const msg = entry?.messages?.[0];
        if (!msg?.from) return Response.json({ ok: true });

        const from = msg.from;
        const wamid = msg.id ?? null;
        const textBody = (msg.text?.body ?? msg.button?.text ?? "").trim();
        const msgType = msg.type ?? "text";

        // Persist conversation + inbound message (idempotent on wamid)
        let conversationId: string | undefined;
        try {
          conversationId = await getOrCreateConversation(from);
          if (!conversationId) return Response.json({ ok: true });

          const { error: insErr } = await supabaseAdmin
            .from("whatsapp_messages")
            .insert({
              conversation_id: conversationId,
              wa_message_id: wamid,
              direction: "inbound",
              message_type: msgType,
              content: textBody || null,
              status: "received",
            });
          if (insErr) {
            // Duplicate (Meta retry) → ack and stop.
            if (String(insErr.message || "").includes("uq_wa_msg_wamid")) {
              return Response.json({ ok: true, deduped: true });
            }
            console.error("[wa] inbound insert failed", insErr);
          }
          await supabaseAdmin
            .from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversationId);
        } catch (e) {
          console.error("[wa] persistence error", e);
        }

        if (!phoneId || !apiToken) return Response.json({ ok: true });

        const persistOutbound = async (
          content: string,
          intent: string | null,
          send: { ok: boolean; wamid: string | null; error: string | null },
        ) => {
          if (!conversationId) return;
          await supabaseAdmin.from("whatsapp_messages").insert({
            conversation_id: conversationId,
            wa_message_id: send.wamid,
            direction: "outbound",
            message_type: "text",
            content,
            status: send.ok ? "sent" : "failed",
            intent,
            error: send.error,
          });
          if (intent) {
            await supabaseAdmin
              .from("whatsapp_conversations")
              .update({ last_intent: intent })
              .eq("id", conversationId);
          }
        };

        try {
          // Keyword shortcuts
          if (textBody && KEYWORD_INSURANCE.test(textBody)) {
            const body = `مرحباً بك في خدمة التأمين الطبي 🩺
لرفع بياناتك (بطاقة التأمين + الوصفة + التشخيص) استخدم الرابط:
https://muslly.com/insurance
تأكد أن:
• بطاقة التأمين سارية
• الوصفة مختومة ومؤرّخة
• التشخيص مكتوب بوضوح`;
            const send = await sendText(phoneId, apiToken, from, body);
            await persistOutbound(body, "insurance", send);
            return Response.json({ ok: true });
          }

          if (textBody && KEYWORD_GREETING.test(textBody)) {
            const body = `أهلاً بك في صيدلية المصلي 🌿
كيف نخدمك؟
• طلب دواء أو منتج
• رفع روشتة طبية: https://muslly.com/prescription
• خدمة التأمين الطبي: https://muslly.com/insurance
• تتبع طلب: https://muslly.com/track`;
            const send = await sendText(phoneId, apiToken, from, body);
            await persistOutbound(body, "greeting", send);
            return Response.json({ ok: true });
          }

          // AI agent
          if (aiKey && textBody && conversationId) {
            const history = await loadHistory(conversationId, 10);
            const result = await runWhatsAppAgent({
              apiKey: aiKey,
              conversationId,
              phone: from,
              history: history.slice(0, -1), // drop the just-inserted inbound; agent receives it via `incoming`
              incoming: textBody,
            });
            const send = await sendText(phoneId, apiToken, from, result.reply);
            await persistOutbound(result.reply, result.intent ?? "ai", send);
            return Response.json({ ok: true, intent: result.intent });
          }

          if (textBody) {
            const body =
              "شكراً لتواصلك. سيرد أحد موظفينا قريباً. للاستعجال: +967 782 878 280";
            const send = await sendText(phoneId, apiToken, from, body);
            await persistOutbound(body, "fallback", send);
          }
        } catch (e) {
          console.error("[wa-webhook] handler error", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
