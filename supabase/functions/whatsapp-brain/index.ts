// Twilio WhatsApp webhook (Supabase Edge Function).
// - Verifies X-Twilio-Signature (HMAC-SHA1 over url + sorted form params, base64).
// - Checks public.wa_allowlist for is_active.
// - Runs a lightweight brain decision (safety keywords + district) and logs to ai_neural_synaptic_log.
// - Replies as TwiML XML.
//
// Note: the full 800-tool SuperBrainSovereign engine lives at
//   /api/public/hooks/whatsapp/twilio (TanStack route) inside the app worker.
// This edge function is a self-contained mirror for callers that must hit
// the Supabase Functions URL directly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
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

function reconstructUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}${url.search}`;
}

function verifyTwilio(token: string, url: string, params: Record<string, string>, sig: string): boolean {
  if (!sig || !token) return false;
  const sorted = Object.keys(params).sort();
  let data = url;
  for (const k of sorted) data += k + params[k];
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

// Lightweight safety layer — the heavy SuperBrain runs on the TanStack route.
function localDecide(text: string, district: string) {
  const started = Date.now();
  const t = text.toLowerCase();
  const chronic: string[] = [];
  if (/(سكري|diabet)/i.test(text)) chronic.push("سكري");
  if (/(ضغط|hyperten|blood pressure)/i.test(text)) chronic.push("ضغط");
  if (/(حامل|pregnan)/i.test(text)) chronic.push("حامل");

  let action = `تم استلام طلبك من ${district}. سيتواصل معك الصيدلي.`;
  let alt: string | null = null;
  let safe = true;

  if (t.includes("ايبوبروفين") || t.includes("ibuprofen")) {
    if (chronic.includes("حامل")) {
      safe = false;
      action = "⚠️ الإيبوبروفين غير آمن أثناء الحمل.";
      alt = "باراسيتامول 500 مج (Panadol)";
    }
  }
  if (t.includes("ديكلوفيناك") && chronic.includes("ضغط")) {
    safe = false;
    action = "⚠️ ديكلوفيناك قد يرفع الضغط.";
    alt = "باراسيتامول 500 مج";
  }

  return {
    decisionId: crypto.randomUUID(),
    isSafe: safe,
    proposedAction: action,
    alternativeSuggested: alt,
    chronic,
    executionSpeedMs: Date.now() - started,
  };
}

function formatReply(d: ReturnType<typeof localDecide>, district: string): string {
  const lines: string[] = [];
  lines.push("🧠 *أوركسترا المخ السيادي — صيدلية المصلي*", "");
  lines.push(d.isSafe ? `✅ *القرار:* ${d.proposedAction}` : `⚠️ *تنبيه سلامة:* ${d.proposedAction}`);
  if (d.alternativeSuggested) lines.push(`💊 *البديل الآمن:* ${d.alternativeSuggested}`);
  lines.push(`📍 *المنطقة:* ${district}`);
  if (d.chronic.length) lines.push(`🩺 *حالات مسجلة:* ${d.chronic.join("، ")}`);
  lines.push("", `⚡ _زمن المعالجة: ${d.executionSpeedMs}ms_`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Buffer body once — need raw for signature and parsed for logic.
  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const sig = req.headers.get("x-twilio-signature") ?? "";
  const fullUrl = reconstructUrl(req);
  if (!verifyTwilio(TWILIO_AUTH_TOKEN, fullUrl, params, sig)) {
    console.warn("[wa-twilio] invalid signature", { fullUrl, hasSig: !!sig });
    return new Response("Forbidden", { status: 403 });
  }

  const from = (params["From"] ?? "").replace(/^whatsapp:/i, "").trim();
  const text = (params["Body"] ?? "").trim();
  if (!from || !text) return twiml("");

  // Allowlist.
  const { data: allow } = await admin
    .from("wa_allowlist")
    .select("phone, district, is_active")
    .eq("phone", from)
    .maybeSingle();

  const allowed = (allow as { is_active?: boolean } | null)?.is_active === true;
  const district = (allow as { district?: string } | null)?.district ?? "عدن";

  if (!allowed) {
    return twiml("⚠️ رقمك غير مصرح له باستخدام هذه الخدمة. يرجى التواصل مع الإدارة.");
  }

  const decision = localDecide(text, district);

  // Best-effort log.
  admin.from("ai_neural_synaptic_log").insert({
    user_id: null,
    trigger_source: "WHATSAPP_TWILIO_EDGE",
    target_destination: "YEMEN_EXPANSION_NETWORK",
    decision_id: decision.decisionId,
    is_safe: decision.isSafe,
    district,
    dispatched_tools: ["SAFETY_LOCAL", "ALLOWLIST"],
    payload_transmitted: { input: { from, text, district }, decision },
    execution_time_ms: decision.executionSpeedMs,
  }).then(() => null, (e) => console.error("[wa-twilio] log failed:", e?.message));

  return twiml(formatReply(decision, district));
});
