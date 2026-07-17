// Twilio WhatsApp webhook → SuperBrainSovereign.
// POST (application/x-www-form-urlencoded): verify Twilio signature → allowlist → decide() → reply via TwiML.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { decide } from "@/modules/ai-brain/services/SuperBrainSovereign";
import type { BrainAdapter } from "@/modules/ai-brain/domain/types";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${
    body ? `<Message>${xmlEscape(body)}</Message>` : ""
  }</Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function formatArabicReply(d: Awaited<ReturnType<typeof decide>>): string {
  const lines: string[] = [];
  lines.push("🧠 *أوركسترا المخ السيادي — صيدلية المصلي*", "");
  lines.push(d.isSafe ? `✅ *القرار المتخذ:* ${d.proposedAction}` : `⚠️ *تنبيه سلامة:* ${d.proposedAction}`);
  if (d.alternativeSuggested) lines.push(`💊 *البديل الآمن:* ${d.alternativeSuggested}`);
  if (d.logisticAction) {
    lines.push(`📍 *الفرع اللوجستي:* ${d.logisticAction.targetBranch} (التوصيل المقدر: ${d.logisticAction.timeMin} دقيقة)`);
  }
  if (d.marketingAction?.isTriggered) {
    lines.push("", `📢 *حملة ترويجية:*`, `"${d.marketingAction.message}"`);
  }
  lines.push("", `⚡ _سرعة معالجة المخ: ${d.executionSpeedMs}ms_`);
  return lines.join("\n");
}

// Twilio request signature: HMAC-SHA1(authToken, fullUrl + sortedParamKeysConcatWithValues), base64.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
function verifyTwilioSignature(
  authToken: string,
  fullUrl: string,
  params: Record<string, string>,
  headerSig: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = fullUrl;
  for (const k of sortedKeys) data += k + params[k];
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(headerSig);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function reconstructUrl(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

async function handlePost(request: Request): Promise<Response> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[wa-twilio] TWILIO_AUTH_TOKEN missing");
    return twiml("");
  }

  // 1. Parse form body.
  let params: Record<string, string> = {};
  try {
    const fd = await request.formData();
    fd.forEach((v, k) => {
      params[k] = typeof v === "string" ? v : "";
    });
  } catch {
    return twiml("");
  }

  // 2. Verify Twilio signature.
  const sig = request.headers.get("x-twilio-signature") ?? "";
  const fullUrl = reconstructUrl(request);
  if (!sig || !verifyTwilioSignature(authToken, fullUrl, params, sig)) {
    console.warn("[wa-twilio] invalid signature");
    return new Response("Forbidden", { status: 403 });
  }

  const fromRaw = params["From"] ?? "";
  const from = fromRaw.replace(/^whatsapp:/i, "").trim();
  const text = (params["Body"] ?? "").trim();
  if (!from || !text) return twiml("");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 3. Allowlist check.
  const { data: allow } = await supabaseAdmin
    .from("wa_allowlist" as never)
    .select("phone, district, is_active")
    .eq("phone", from)
    .maybeSingle();
  const allowed = (allow as { is_active?: boolean } | null)?.is_active === true;
  const district = (allow as { district?: string } | null)?.district ?? "عدن";

  if (!allowed) {
    return twiml("⚠️ رقمك غير مصرح له باستخدام هذه الخدمة. يرجى التواصل مع الإدارة.");
  }

  // 4. Brain decide.
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
    decision = await decide({ userId: from, userInput: text, district }, adapter);
  } catch (err) {
    console.error("[wa-twilio] decide failed:", (err as Error).message);
    return twiml("تعذّر تحليل طلبك حالياً، سنعاود التواصل قريباً.");
  }

  // 5. Log (best-effort).
  await supabaseAdmin
    .from("ai_neural_synaptic_log" as never)
    .insert({
      user_id: null,
      trigger_source: "WHATSAPP_TWILIO_INBOUND",
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

  return twiml(formatArabicReply(decision));
}

export const Route = createFileRoute("/api/public/hooks/whatsapp/twilio")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handlePost(request);
        } catch (err) {
          console.error("[wa-twilio] fatal:", (err as Error).message);
          return twiml("");
        }
      },
    },
  },
});
