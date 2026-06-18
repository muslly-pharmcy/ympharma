import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHmac } from "crypto";

const STAFF_PHONES = ["967782878280", "967774068936"];
const COOLDOWN_MINUTES = 30;

/** Send a WhatsApp text alert to all staff phones. */
async function sendWa(text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp not configured");
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  for (const to of STAFF_PHONES) {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 4000) },
      }),
    }).catch(() => { /* swallow per-recipient */ });
  }
}

/**
 * Send an alert to staff for a given key with cooldown.
 * Same key within COOLDOWN_MINUTES → skipped.
 */
export const sendIncidentAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      key: z.string().min(2).max(120),
      message: z.string().min(2).max(3000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).in("role", ["owner", "admin"]).maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    // Cooldown check
    const { data: existing } = await context.supabase
      .from("alert_dedupe")
      .select("last_sent_at,count")
      .eq("alert_key", data.key)
      .maybeSingle();

    if (existing) {
      const last = new Date(existing.last_sent_at).getTime();
      const ageMin = (Date.now() - last) / 60000;
      if (ageMin < COOLDOWN_MINUTES) {
        return { sent: false, reason: "cooldown", minutesRemaining: Math.ceil(COOLDOWN_MINUTES - ageMin) };
      }
    }

    try { await sendWa(data.message); }
    catch (e) { throw new Error("WhatsApp send failed: " + (e instanceof Error ? e.message : String(e))); }

    await context.supabase
      .from("alert_dedupe")
      .upsert({
        alert_key: data.key,
        last_sent_at: new Date().toISOString(),
        count: (existing?.count ?? 0) + 1,
      }, { onConflict: "alert_key" });

    return { sent: true, recipients: STAFF_PHONES.length };
  });

/**
 * Admin-triggered test: send a signed event to our own /api/public/uptime-webhook
 * to verify HMAC + handler end-to-end.
 */
export const testUptimeWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      event: z.enum(["down", "up"]).default("down"),
      severity: z.enum(["minor", "major", "critical"]).default("minor"),
      baseUrl: z.string().url().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).in("role", ["owner", "admin"]).maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const secret = process.env.UPTIME_WEBHOOK_SECRET;
    if (!secret) return { ok: false, error: "UPTIME_WEBHOOK_SECRET غير مُعد. أضفه من إعدادات الأسرار." };

    const body = JSON.stringify({
      event: data.event,
      severity: data.severity,
      summary: data.event === "down" ? "اختبار يدوي من لوحة التحكم" : "تم استعادة الخدمة (اختبار)",
    });
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    const base = data.baseUrl ?? "https://muslly.com";
    const res = await fetch(`${base}/api/public/uptime-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-uptime-signature": sig },
      body,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, response: text.slice(0, 500) };
  });

/**
 * Periodic check (called by pg_cron via /api/public/incident-check) that detects
 * new open incidents and sends throttled WA alerts. Idempotent: each open
 * incident sends at most one alert per cooldown window.
 */
export async function dispatchOpenIncidentAlerts() {
  const supabase = (await import("@supabase/supabase-js")).createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: open } = await supabase
    .from("uptime_incidents")
    .select("id,started_at,severity,summary")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(5);

  if (!open || open.length === 0) return { dispatched: 0 };

  let dispatched = 0;
  for (const inc of open) {
    const key = `incident:${inc.id}`;
    const { data: dedupe } = await supabase
      .from("alert_dedupe").select("last_sent_at").eq("alert_key", key).maybeSingle();
    if (dedupe) {
      const ageMin = (Date.now() - new Date(dedupe.last_sent_at).getTime()) / 60000;
      if (ageMin < COOLDOWN_MINUTES) continue;
    }
    const text = `🚨 حادث ${inc.severity}\n${inc.summary}\nبدأ: ${new Date(inc.started_at).toLocaleString("ar")}\nرقم: ${inc.id}`;
    try { await sendWa(text); } catch { continue; }
    await supabase.from("alert_dedupe").upsert({
      alert_key: key,
      last_sent_at: new Date().toISOString(),
      count: 1,
    }, { onConflict: "alert_key" });
    dispatched++;
  }
  return { dispatched };
}
