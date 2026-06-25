// Cron-driven: scans recent agent outputs for warning conditions and dispatches
// alerts via email + operations_alerts_v14 with dedupe.
// Schedule recommendation: every 30 minutes.
// Auth: x-cron-secret.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const REPORT_URL = "https://muslly.com/admin-agent-runs";

type AlertRow = {
  alert_key: string;
  agent: string;
  severity: string;
  message: string;
  payload: Record<string, unknown> | null;
};

export const Route = createFileRoute("/api/public/hooks/agent-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: alerts, error } = await supabaseAdmin.rpc("get_agent_alerts");
        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const rows = (alerts as AlertRow[] | null) ?? [];
        if (rows.length === 0) return Response.json({ ok: true, alerts: 0 });

        const recipientsCsv = process.env.STAFF_ALERT_EMAILS ?? process.env.ADMIN_ALERT_EMAILS ?? "";
        const recipients = recipientsCsv.split(",").map((s) => s.trim()).filter(Boolean);

        let sent = 0;
        let opsInserted = 0;

        for (const row of rows) {
          // ops alert (dedupe via unique key per user_id+dedupe_key; user_id NULL = global)
          const { error: opsErr } = await supabaseAdmin
            .from("operations_alerts_v14")
            .upsert(
              {
                user_id: null,
                alert_type: `${row.agent}.${row.severity}`,
                message: row.message,
                dedupe_key: row.alert_key,
              },
              { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
            );
          if (!opsErr) opsInserted += 1;

          if (recipients.length === 0) continue;

          // cooldown 6h via alert_dedupe
          const cooldownKey = `agent_alert:${row.alert_key}`;
          const { data: dedupe } = await supabaseAdmin
            .from("alert_dedupe")
            .select("last_sent_at")
            .eq("alert_key", cooldownKey)
            .maybeSingle();
          if (dedupe) {
            const ageH = (Date.now() - new Date(dedupe.last_sent_at).getTime()) / 3600_000;
            if (ageH < 6) continue;
          }

          const subject = `[${row.severity.toUpperCase()}] ${row.agent} — ${row.message}`;
          const html = `
            <div style="font-family:system-ui,sans-serif;max-width:560px">
              <h2 style="color:#b91c1c">تنبيه وكيل ${row.agent}</h2>
              <p><strong>الشدة:</strong> ${row.severity}</p>
              <p>${row.message}</p>
              <pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px">${JSON.stringify(row.payload ?? {}, null, 2)}</pre>
              <p><a href="${REPORT_URL}" style="background:#0f172a;color:white;padding:10px 18px;border-radius:6px;text-decoration:none">عرض التقرير الكامل</a></p>
            </div>`;

          for (const to of recipients) {
            const messageId = `agent-alert-${row.alert_key}-${Date.now()}`;
            const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                message_id: messageId,
                to,
                from: "ympharma <no-reply@muslly.com>",
                sender_domain: "notify.muslly.com",
                subject,
                html,
                purpose: "transactional",
                label: "agent-alert",
                idempotency_key: messageId,
                queued_at: new Date().toISOString(),
              },
            });
            if (!enqErr) {
              sent += 1;
              await supabaseAdmin.from("email_send_log").insert({
                message_id: messageId,
                template_name: "agent-alert",
                recipient_email: to,
                status: "pending",
              });
            }
          }

          await supabaseAdmin.from("alert_dedupe").upsert(
            { alert_key: cooldownKey, last_sent_at: new Date().toISOString(), count: 1 },
            { onConflict: "alert_key" },
          );
        }

        return Response.json({ ok: true, alerts: rows.length, emails_sent: sent, ops_inserted: opsInserted });
      },
    },
  },
});
