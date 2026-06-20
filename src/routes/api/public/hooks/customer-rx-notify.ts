// Phase 6C Sprint 1+2+4 — Customer WhatsApp Notification Dispatcher.
//
// Cron-driven (pg_cron, x-cron-secret). Each tick:
//   1) Claims due dispatch rows via claim_customer_rx_notifications (FIFO,
//      FOR UPDATE SKIP LOCKED, atomically transitions pending/failed → sending
//      and increments attempts).
//   2) Renders the template body for each row.
//   3) Sends to WhatsApp Cloud API.
//   4) Marks success / failure via SECURITY DEFINER RPCs. Failures use
//      exponential backoff; exhausted retries raise WHATSAPP_DELIVERY_FAILED
//      in operations_alerts.
//
// Idempotency: enforced by UNIQUE (event_id, recipient_phone) on the
// dispatch table at insertion time (trigger). The dispatcher itself never
// inserts new dispatch rows.
//
// Audit: every attempt updates the dispatch row (attempts, last_error,
// wamid, sent_at, duration_ms, rendered_body). Correlation IDs carry
// across event → dispatch → operations_alerts.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

type DispatchRow = {
  id: string;
  event_id: string;
  event_name: string;
  correlation_id: string | null;
  prescription_id: string | null;
  order_id: string | null;
  recipient_phone: string;
  template_id: string;
  attempts: number;
  max_attempts: number;
};

type Template = {
  id: string;
  body_template: string;
  enabled: boolean;
  variables: string[];
};

type Settings = {
  baseSeconds: number;
  pharmacyName: string;
  optOutBaseUrl: string;
  trackingBaseUrl: string;
  masterOn: boolean;
  rxOn: boolean;
  ordersOn: boolean;
};


function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : "",
  );
}

async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<{ ok: boolean; wamid: string | null; error?: string; status: number }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, wamid: null, error: "whatsapp_not_configured", status: 503 };
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      ok: false,
      wamid: null,
      error: json?.error?.message ?? `http_${res.status}`,
      status: res.status,
    };
  }
  return { ok: true, wamid: json?.messages?.[0]?.id ?? null, status: res.status };
}

export const Route = createFileRoute("/api/public/hooks/customer-rx-notify")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          hint: "POST with x-cron-secret. Optional body: {\"limit\": 25}",
        }),
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        const body = await request.json().catch(() => ({} as { limit?: number }));
        const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 100);
        const started = Date.now();

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Load settings + templates up-front (cheap, small).
          const [{ data: settingsRows }, { data: tplRows }] = await Promise.all([
            supabaseAdmin
              .from("app_settings")
              .select("key, value")
              .in("key", [
                "customer_whatsapp_enabled",
                "prescription_notifications_enabled",
                "order_notifications_enabled",
                "whatsapp_retry_base_seconds",
                "whatsapp_pharmacy_name",
                "whatsapp_opt_out_base_url",
                "whatsapp_tracking_base_url",
              ]),
            supabaseAdmin
              .from("whatsapp_notification_templates")
              .select("id, body_template, enabled, variables"),
          ]);

          const sMap = new Map<string, unknown>(
            ((settingsRows ?? []) as Array<{ key: string; value: unknown }>).map((r) => [
              r.key,
              r.value,
            ]),
          );
          const settings: Settings = {
            baseSeconds: Number(sMap.get("whatsapp_retry_base_seconds") ?? 30) || 30,
            pharmacyName:
              typeof sMap.get("whatsapp_pharmacy_name") === "string"
                ? (sMap.get("whatsapp_pharmacy_name") as string)
                : "صيدلية المصلي",
            optOutBaseUrl:
              typeof sMap.get("whatsapp_opt_out_base_url") === "string"
                ? (sMap.get("whatsapp_opt_out_base_url") as string)
                : "https://muslly.com/notifications",
            trackingBaseUrl:
              typeof sMap.get("whatsapp_tracking_base_url") === "string"
                ? (sMap.get("whatsapp_tracking_base_url") as string)
                : "https://muslly.com/track",
            masterOn: sMap.get("customer_whatsapp_enabled") === true,
            rxOn: sMap.get("prescription_notifications_enabled") === true,
            ordersOn: sMap.get("order_notifications_enabled") === true,
          };

          // Master kill-switch (defense-in-depth — trigger also enforces).
          if (!settings.masterOn || (!settings.rxOn && !settings.ordersOn)) {
            return Response.json({
              ok: true,
              skipped: "master_off",
              elapsed_ms: Date.now() - started,
            });
          }


          const templates = new Map<string, Template>(
            ((tplRows ?? []) as Template[]).map((t) => [t.id, t]),
          );

          // Claim batch atomically.
          const { data: claimed, error: claimErr } = await supabaseAdmin.rpc(
            "claim_customer_rx_notifications" as never,
            { _limit: limit } as never,
          );
          if (claimErr) {
            return Response.json(
              { ok: false, stage: "claim", error: claimErr.message },
              { status: 500 },
            );
          }

          const rows = (claimed ?? []) as DispatchRow[];
          if (rows.length === 0) {
            return Response.json({ ok: true, claimed: 0, elapsed_ms: Date.now() - started });
          }

          let sent = 0;
          let failed = 0;
          let dead = 0;
          const outcomes: Array<{
            id: string;
            event_name: string;
            ok: boolean;
            note: string;
            attempts: number;
          }> = [];

          for (const row of rows) {
            const t0 = Date.now();
            try {
              const tpl = templates.get(row.template_id);
              if (!tpl || !tpl.enabled) {
                await supabaseAdmin.rpc("mark_customer_rx_notification_failed" as never, {
                  _id: row.id,
                  _error: tpl ? "template_disabled" : "template_missing",
                  _base_seconds: settings.baseSeconds,
                } as never);
                failed++;
                outcomes.push({
                  id: row.id,
                  event_name: row.event_name,
                  ok: false,
                  note: tpl ? "template_disabled" : "template_missing",
                  attempts: row.attempts,
                });
                continue;
              }

              // Resolve dynamic variables.
              const pharmacyName = settings.pharmacyName;
              let optOutToken = "";
              const { data: pref } = await supabaseAdmin
                .from("customer_notification_preferences")
                .select("opt_out_token")
                .eq("phone", row.recipient_phone)
                .maybeSingle();
              optOutToken = (pref as { opt_out_token?: string } | null)?.opt_out_token ?? "";
              const optOutUrl = optOutToken
                ? `${settings.optOutBaseUrl}?t=${optOutToken}`
                : settings.optOutBaseUrl;

              const isOrder = row.event_name.startsWith("ORDER_");
              const refId = isOrder ? row.order_id : row.prescription_id;
              const trackingUrl = isOrder && row.order_id
                ? `${settings.trackingBaseUrl}?id=${encodeURIComponent(row.order_id)}`
                : settings.trackingBaseUrl;

              const rendered = renderTemplate(tpl.body_template, {
                order_number: refId ?? "—",
                pharmacy_name: pharmacyName,
                review_date: new Date().toLocaleDateString("ar-EG"),
                event_date: new Date().toLocaleDateString("ar-EG"),
                tracking_url: trackingUrl,
                opt_out_url: optOutUrl,
              });

              const result = await sendWhatsAppText(row.recipient_phone, rendered);
              const dur = Date.now() - t0;

              // Mirror to whatsapp_delivery_logs for unified observability.
              await supabaseAdmin.from("whatsapp_delivery_logs").insert({
                message_kind: isOrder ? "customer_order_notification" : "customer_rx_notification",
                recipient_phone: row.recipient_phone,
                template_name: row.template_id,
                payload: {
                  dispatch_id: row.id,
                  event_id: row.event_id,
                  correlation_id: row.correlation_id,
                  attempts: row.attempts,
                } as never,
                wamid: result.wamid,
                status: result.ok ? "sent" : "failed",
                error_message: result.error ?? null,
                ref_kind: isOrder ? "order" : "prescription",
                ref_id: refId,
                sent_at: result.ok ? new Date().toISOString() : null,
              });


              if (result.ok) {
                await supabaseAdmin.rpc("mark_customer_rx_notification_sent" as never, {
                  _id: row.id,
                  _wamid: result.wamid,
                  _duration_ms: dur,
                  _rendered_body: rendered,
                } as never);
                sent++;
                outcomes.push({
                  id: row.id,
                  event_name: row.event_name,
                  ok: true,
                  note: "sent",
                  attempts: row.attempts,
                });
              } else {
                const { data: failRes } = await supabaseAdmin.rpc(
                  "mark_customer_rx_notification_failed" as never,
                  {
                    _id: row.id,
                    _error: result.error ?? `http_${result.status}`,
                    _base_seconds: settings.baseSeconds,
                  } as never,
                );
                failed++;
                if ((failRes as { dead?: boolean } | null)?.dead) dead++;
                outcomes.push({
                  id: row.id,
                  event_name: row.event_name,
                  ok: false,
                  note: result.error ?? `http_${result.status}`,
                  attempts: row.attempts,
                });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              await supabaseAdmin
                .rpc("mark_customer_rx_notification_failed" as never, {
                  _id: row.id,
                  _error: `exception:${msg}`,
                  _base_seconds: settings.baseSeconds,
                } as never)
                .then(() => undefined, () => undefined);
              failed++;
              outcomes.push({
                id: row.id,
                event_name: row.event_name,
                ok: false,
                note: `exception:${msg}`,
                attempts: row.attempts,
              });
            }
          }

          return Response.json({
            ok: true,
            claimed: rows.length,
            sent,
            failed,
            dead,
            elapsed_ms: Date.now() - started,
            outcomes: outcomes.slice(0, 50),
          });
        } catch (e) {
          return Response.json(
            {
              ok: false,
              stage: "dispatcher",
              error: e instanceof Error ? e.message : String(e),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
