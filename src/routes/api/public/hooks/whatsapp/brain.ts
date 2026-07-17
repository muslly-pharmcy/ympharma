// WhatsApp Cloud API webhook → SuperBrainSovereign.
// - GET: Meta subscribe verification
// - POST: inbound message → allowlist → decide() → reply via Graph API
import { createFileRoute } from "@tanstack/react-router";
import { decide } from "@/modules/ai-brain/services/SuperBrainSovereign";
import type { BrainAdapter } from "@/modules/ai-brain/domain/types";

const GRAPH_VERSION = "v20.0";

async function sendWhatsAppText(phoneNumberId: string, token: string, to: string, body: string) {
  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
  } catch (err) {
    console.error("[wa-brain] send failed:", (err as Error).message);
  }
}

function formatArabicReply(d: Awaited<ReturnType<typeof decide>>): string {
  const lines: string[] = [];
  lines.push("🧠 *المخ الصناعي الخارق — صيدلية المصلي*", "");
  lines.push(d.isSafe ? `✅ *القرار:* ${d.proposedAction}` : `⚠️ *تنبيه سلامة:* ${d.proposedAction}`);
  if (d.alternativeSuggested) lines.push(`💊 *البديل الآمن:* ${d.alternativeSuggested}`);
  if (d.logisticAction) {
    lines.push(`📍 *التوجيه:* ${d.logisticAction.targetBranch} — خلال ${d.logisticAction.timeMin} دقيقة`);
  }
  if (d.marketingAction?.isTriggered) {
    lines.push("", `📢 *حملة مقترحة:*`, `"${d.marketingAction.message}"`);
  }
  lines.push("", `⚡ _زمن المعالجة: ${d.executionSpeedMs}ms_`);
  return lines.join("\n");
}

async function handlePost(request: Request): Promise<Response> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("[wa-brain] missing WhatsApp env");
    // Always 200 to avoid Meta retry loops.
    return Response.json({ ok: true, skipped: "not_configured" });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: true, skipped: "bad_json" });
  }

  const messageObj = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!messageObj) return Response.json({ ok: true, skipped: "no_message" });

  const from: string = String(messageObj.from ?? "");
  const text: string = String(messageObj.text?.body ?? "").trim();
  if (!from || !text) return Response.json({ ok: true, skipped: "empty" });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Allowlist check.
  const { data: allow } = await supabaseAdmin
    .from("wa_allowlist" as never)
    .select("phone, district, is_active")
    .eq("phone", from)
    .maybeSingle();
  const allowed = (allow as { is_active?: boolean } | null)?.is_active === true;
  const district = (allow as { district?: string } | null)?.district ?? "عدن";

  // 2. (Inbound is captured inside ai_neural_synaptic_log.payload_transmitted.)

  if (!allowed) {
    await sendWhatsAppText(
      phoneNumberId,
      token,
      from,
      "⚠️ رقمك غير مصرح له باستخدام هذه الخدمة. يرجى التواصل مع الإدارة.",
    );
    return Response.json({ ok: true, blocked: true });
  }

  // 3. Brain decide with admin-backed adapter.
  const adapter: BrainAdapter = {
    async findNearbyPharmacy(medicineHint, lat, lng, dist) {
      try {
        const { data } = await supabaseAdmin.rpc("pn_search_medicine_nearby" as never, {
          _q: medicineHint, _lat: lat, _lng: lng, _radius_km: 25, _limit: 5,
        } as never);
        const rows = (data ?? []) as Array<{ pharmacy_id?: string; name?: string; distance_km?: number }>;
        if (!rows.length) return null;
        const first = rows[0];
        return {
          id: first.pharmacy_id ?? "",
          name: first.name ?? `صيدلية قريبة — ${dist}`,
          distanceKm: typeof first.distance_km === "number" ? first.distance_km : null,
        };
      } catch { return null; }
    },
    async suggestAlternative(medicineHint) {
      try {
        const { data } = await supabaseAdmin.rpc("search_medicines_public" as never, {
          _q: medicineHint, _limit: 3,
        } as never);
        const rows = (data ?? []) as Array<{ name_ar?: string; name?: string }>;
        if (!rows.length) return null;
        return rows[0].name_ar ?? rows[0].name ?? null;
      } catch { return null; }
    },
  };

  let decision;
  try {
    decision = await decide(
      { userId: from, userInput: text, district },
      adapter,
    );
  } catch (err) {
    console.error("[wa-brain] decide failed:", (err as Error).message);
    await sendWhatsAppText(phoneNumberId, token, from, "تعذّر تحليل طلبك حالياً، سنعاود التواصل قريباً.");
    return Response.json({ ok: true, error: "decide_failed" });
  }

  // 4. Log to neural log (best-effort).
  await supabaseAdmin
    .from("ai_neural_synaptic_log" as never)
    .insert({
      user_id: null,
      trigger_source: "WHATSAPP_INBOUND",
      target_destination: "YEMEN_EXPANSION_NETWORK",
      decision_id: decision.decisionId,
      is_safe: decision.isSafe,
      district,
      dispatched_tools: decision.dispatchedTools,
      payload_transmitted: JSON.parse(JSON.stringify({
        input: { from, text, district }, decision,
      })),
      execution_time_ms: decision.executionSpeedMs,
    } as never)
    .then(() => null, () => null);

  // 5. Reply + log outbound.
  const reply = formatArabicReply(decision);
  await sendWhatsAppText(phoneNumberId, token, from, reply);
  await supabaseAdmin
    .from("whatsapp_messages" as never)
    .insert({ from_number: from, message_body: reply, direction: "outbound" } as never)
    .then(() => null, () => null);

  return Response.json({ ok: true, decisionId: decision.decisionId });
}

export const Route = createFileRoute("/api/public/hooks/whatsapp/brain")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const verify = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && verify && token === verify && challenge) {
          return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
        }
        return new Response("forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        try {
          return await handlePost(request);
        } catch (err) {
          console.error("[wa-brain] fatal:", (err as Error).message);
          // Always 200 for Meta.
          return Response.json({ ok: true, error: "handler_error" });
        }
      },
    },
  },
});
