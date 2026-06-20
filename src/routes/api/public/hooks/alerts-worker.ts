// Cron-driven WhatsApp alert worker.
// Drains `public.staff_alerts` rows where whatsapp_status='pending' and
// 'whatsapp' is in `channels`, sends a WhatsApp Cloud API text message to each
// configured staff number, and marks the row as sent/failed/skipped.
//
// Called by pg_cron (no body) → see /docs/cron-setup.md.
// Public endpoint (no auth header required for the route itself); the
// destructive write is server-side and only the worker can reach the table
// via the service role.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const MAX_BATCH = 25;
const MAX_ATTEMPTS = 4;
const GRAPH_URL = (phoneId: string) => `https://graph.facebook.com/v21.0/${phoneId}/messages`;

function normalizePhone(raw: string): string {
  const d = (raw || "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("967")) return d;
  if (d.startsWith("0")) return "967" + d.slice(1);
  if (d.length === 9) return "967" + d;
  return d;
}

async function sendText(phoneId: string, token: string, to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(GRAPH_URL(phoneId), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `${res.status}: ${txt.slice(0, 200)}` };
  }
  return { ok: true };
}

export const Route = createFileRoute("/api/public/hooks/alerts-worker")({
  server: {
    handlers: {
      POST: async () => {
        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const recipientsCsv = process.env.STAFF_ALERT_RECIPIENTS ?? "";
        const recipients = recipientsCsv.split(",").map((s) => normalizePhone(s.trim())).filter(Boolean);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: pending, error } = await supabaseAdmin
          .from("staff_alerts")
          .select("id,kind,severity,title,body,channels,whatsapp_attempts")
          .eq("whatsapp_status", "pending")
          .order("created_at", { ascending: true })
          .limit(MAX_BATCH);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!pending || pending.length === 0) return Response.json({ ok: true, drained: 0, skipped: 0 });

        // No config → mark skipped, do not loop forever.
        if (!token || !phoneId || recipients.length === 0) {
          const ids = pending.map((p) => p.id);
          await supabaseAdmin.from("staff_alerts")
            .update({ whatsapp_status: "skipped", whatsapp_last_error: "no_config" } as never)
            .in("id", ids);
          return Response.json({ ok: true, drained: 0, skipped: ids.length, reason: "missing WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / STAFF_ALERT_RECIPIENTS" });
        }

        let sent = 0, failed = 0;
        for (const a of pending as Array<{ id: string; kind: string; severity: string; title: string; body: string | null; channels: string[]; whatsapp_attempts: number }>) {
          if (!a.channels?.includes("whatsapp")) {
            await supabaseAdmin.from("staff_alerts").update({ whatsapp_status: "skipped" } as never).eq("id", a.id);
            continue;
          }
          const prefix = a.severity === "critical" ? "🚨" : a.severity === "warn" ? "⚠️" : "🔔";
          const msg = `${prefix} ${a.title}\n${a.body ?? ""}\n— صيدلية المصلي`;
          let lastErr: string | undefined;
          let allOk = true;
          for (const to of recipients) {
            const r = await sendText(phoneId, token, to, msg);
            if (!r.ok) { allOk = false; lastErr = r.error; }
          }
          const attempts = (a.whatsapp_attempts ?? 0) + 1;
          if (allOk) {
            await supabaseAdmin.from("staff_alerts")
              .update({ whatsapp_status: "sent", whatsapp_attempts: attempts, whatsapp_last_error: null } as never)
              .eq("id", a.id);
            sent++;
          } else {
            const status = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
            await supabaseAdmin.from("staff_alerts")
              .update({ whatsapp_status: status, whatsapp_attempts: attempts, whatsapp_last_error: lastErr } as never)
              .eq("id", a.id);
            failed++;
          }
        }
        return Response.json({ ok: true, sent, failed, scanned: pending.length });
      },
    },
  },
});
