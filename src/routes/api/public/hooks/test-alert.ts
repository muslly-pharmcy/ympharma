// Temporary test endpoint to verify Slack/SMS/WhatsApp delivery without
// polluting alert_dedupe or operations_alerts_v14.
// Auth: x-cron-secret. Remove when no longer needed.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { sendSlack, sendSms, sendWhatsApp } from "@/lib/alert-dispatch.server";

const REPORT_URL = "https://muslly.com/admin-agent-runs";

export const Route = createFileRoute("/api/public/hooks/test-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        let body: any = {};
        try { body = await request.json(); } catch { /* empty body ok */ }
        const channel = String(body.channel ?? "all");
        const severity = String(body.severity ?? "high");
        const to = body.to ? String(body.to) : null;
        const message = String(body.message ?? `🧪 TEST ALERT — ${new Date().toISOString()}`);

        const results: Record<string, any> = {};

        if (channel === "slack" || channel === "all") {
          results.slack_env_present = Boolean(process.env.SLACK_WEBHOOK_URL);
          results.slack_ok = await sendSlack({
            agent: "test",
            severity,
            message,
            reportUrl: REPORT_URL,
            payload: { test: true },
          });
        }

        if (channel === "sms" || channel === "all") {
          results.twilio_env_present = {
            api_key: Boolean(process.env.TWILIO_API_KEY),
            from: Boolean(process.env.TWILIO_FROM_NUMBER),
            lovable: Boolean(process.env.LOVABLE_API_KEY),
          };
          if (to) {
            results.sms_ok = await sendSms({ to, message });
          } else if (channel !== "all") {
            results.sms_skipped = "missing 'to' field";
          } else {
            // For "all", iterate active SMS subscribers
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: subs } = await supabaseAdmin
              .from("alert_subscribers")
              .select("phone_e164,receive_sms")
              .eq("active", true)
              .eq("receive_sms", true);
            results.sms_subscribers = subs?.length ?? 0;
            results.sms_results = [];
            for (const s of subs ?? []) {
              const ok = await sendSms({ to: s.phone_e164, message });
              results.sms_results.push({ to: s.phone_e164, ok });
            }
          }
        }

        if (channel === "whatsapp" || channel === "all") {
          results.whatsapp_env_present = {
            token: Boolean(process.env.WHATSAPP_TOKEN),
            phone_id: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
          };
          if (to) {
            results.whatsapp_ok = await sendWhatsApp({ to, message });
          } else if (channel !== "all") {
            results.whatsapp_skipped = "missing 'to' field";
          } else {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: subs } = await supabaseAdmin
              .from("alert_subscribers")
              .select("phone_e164,receive_whatsapp")
              .eq("active", true)
              .eq("receive_whatsapp", true);
            results.whatsapp_subscribers = subs?.length ?? 0;
            results.whatsapp_results = [];
            for (const s of subs ?? []) {
              const ok = await sendWhatsApp({ to: s.phone_e164, message });
              results.whatsapp_results.push({ to: s.phone_e164, ok });
            }
          }
        }

        return Response.json({ ok: true, channel, severity, results });
      },
    },
  },
});
