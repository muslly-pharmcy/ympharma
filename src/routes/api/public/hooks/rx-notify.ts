// Phase 6B Sprint 1 — WhatsApp Prescription Notifications Dispatcher.
//
// Runs every minute via pg_cron. Picks up unprocessed PrescriptionUploaded
// events, mints short-lived signed URLs for each registry file, sends a
// WhatsApp message to the configured staff recipients, then marks the event
// processed and emits PRESCRIPTION_URL_GENERATED / PRESCRIPTION_REVIEW_REQUESTED
// follow-up events (Sprint 2 partial).
//
// Safe by default: no message is sent unless app_settings
// `prescription_notify_enabled = true` AND `prescription_notify_recipients`
// contains at least one phone number.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

type Setting = { key: string; value: unknown };

function normalizePhone(raw: string): string {
  const d = (raw || "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("967")) return d;
  if (d.startsWith("0")) return "967" + d.slice(1);
  if (d.length === 9) return "967" + d;
  return d;
}

function buildStaffMessage(opts: {
  rxId: string;
  customerName: string;
  customerPhone: string;
  imageCount: number;
  signedUrls: string[];
  adminUrl: string;
}): string {
  const lines = [
    "🏥 *صيدلية المصلي* — روشتة جديدة",
    "━━━━━━━━━━━━━━━",
    `🆔 المرجع: *${opts.rxId}*`,
    `👤 العميل: ${opts.customerName}`,
    `📞 الهاتف: ${opts.customerPhone}`,
    `🖼️ عدد الصور: ${opts.imageCount}`,
    "",
    "🔐 *روابط الصور (صالحة 15 دقيقة):*",
    ...opts.signedUrls.map((u, i) => `   ${i + 1}. ${u}`),
    "",
    `🛠️ فتح في لوحة الإدمن:\n   ${opts.adminUrl}`,
  ];
  return lines.filter(Boolean).join("\n");
}

async function sendWhatsAppText(to: string, body: string): Promise<{ ok: boolean; wamid: string | null; status: number; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, wamid: null, status: 503, error: "whatsapp_not_configured" };
  }
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, preview_url: false },
  };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!res.ok) {
    return { ok: false, wamid: null, status: res.status, error: json?.error?.message ?? `http_${res.status}` };
  }
  return { ok: true, wamid: json?.messages?.[0]?.id ?? null, status: res.status };
}

export const Route = createFileRoute("/api/public/hooks/rx-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        try {
          const body = await request.json().catch(() => ({} as { limit?: number }));
          const limit = typeof body?.limit === "number" ? Math.min(50, Math.max(1, body.limit)) : 20;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1) Load configuration
          const { data: settingsRows } = await supabaseAdmin
            .from("app_settings")
            .select("key, value")
            .in("key", [
              "prescription_notify_enabled",
              "prescription_notify_recipients",
              "prescription_signed_url_ttl_seconds",
            ]);
          const settings = new Map<string, unknown>(
            ((settingsRows ?? []) as Setting[]).map((r) => [r.key, r.value]),
          );
          const enabled = settings.get("prescription_notify_enabled") === true;
          const recipientsRaw = settings.get("prescription_notify_recipients");
          const recipients = Array.isArray(recipientsRaw)
            ? (recipientsRaw as unknown[]).map((x) => normalizePhone(String(x))).filter(Boolean)
            : [];
          const ttl = Number(settings.get("prescription_signed_url_ttl_seconds") ?? 900) || 900;

          if (!enabled || recipients.length === 0) {
            return Response.json({ ok: true, skipped: "disabled_or_no_recipients", picked: 0 });
          }

          // 2) Pick unprocessed prescription-uploaded events (canonical + legacy alias)
          const { data: events, error: evErr } = await supabaseAdmin
            .from("agent_events")
            .select("id, entity_id, payload, occurred_at, correlation_id")
            .in("event_name", ["PRESCRIPTION_UPLOADED", "PrescriptionUploaded"])
            .is("processed_at", null)
            .order("occurred_at", { ascending: true })
            .limit(limit);
          if (evErr) {
            return Response.json({ ok: false, error: evErr.message }, { status: 500 });
          }
          if (!events || events.length === 0) {
            return Response.json({ ok: true, picked: 0 });
          }

          const origin = "https://muslly.com";
          let sent = 0;
          let failed = 0;
          const results: Array<{ rx: string; ok: boolean; error?: string }> = [];

          for (const ev of events) {
            const rxId = ev.entity_id as string;
            try {
              // Fetch prescription + registry files
              const [{ data: rx }, { data: files }] = await Promise.all([
                supabaseAdmin
                  .from("prescriptions")
                  .select("id, customer_name, customer_phone, image_urls")
                  .eq("id", rxId)
                  .maybeSingle(),
                supabaseAdmin
                  .from("prescription_files" as never)
                  .select("id, bucket, object_path")
                  .eq("prescription_id", rxId)
                  .is("deleted_at", null),
              ]);
              if (!rx) {
                failed++;
                results.push({ rx: rxId, ok: false, error: "rx_not_found" });
                continue;
              }

              // Mint signed URLs from registry; fall back to legacy image_urls.
              const signedUrls: string[] = [];
              const registry = (files ?? []) as unknown as Array<{ bucket: string; object_path: string }>;
              for (const f of registry) {
                const { data: signed } = await supabaseAdmin.storage
                  .from(f.bucket)
                  .createSignedUrl(f.object_path, ttl);
                if (signed?.signedUrl) signedUrls.push(signed.signedUrl);
              }
              if (signedUrls.length === 0 && Array.isArray(rx.image_urls)) {
                for (const u of rx.image_urls as string[]) signedUrls.push(u);
              }

              const adminUrl = `${origin}/admin?rx=${encodeURIComponent(rxId)}`;
              const message = buildStaffMessage({
                rxId,
                customerName: rx.customer_name,
                customerPhone: rx.customer_phone,
                imageCount: signedUrls.length,
                signedUrls,
                adminUrl,
              });

              let anySent = false;
              for (const to of recipients) {
                const r = await sendWhatsAppText(to, message);
                await supabaseAdmin.from("whatsapp_delivery_logs").insert({
                  message_kind: "prescription_review_request",
                  recipient_phone: to,
                  payload: { rxId, signedUrlCount: signedUrls.length } as never,
                  wamid: r.wamid,
                  status: r.ok ? "sent" : "failed",
                  error_message: r.error ?? null,
                  ref_kind: "prescription",
                  ref_id: rxId,
                  sent_at: r.ok ? new Date().toISOString() : null,
                });
                if (r.ok) anySent = true;
              }

              // Sprint 2: follow-up events
              await supabaseAdmin.rpc("emit_agent_event", {
                _event_name: "PRESCRIPTION_URL_GENERATED",
                _entity_type: "prescription",
                _entity_id: rxId,
                _payload: { ttl_seconds: ttl, count: signedUrls.length } as never,
                _source: "rx-notify",
              } as never).then(() => undefined, () => undefined);

              // Mark original event processed
              await supabaseAdmin
                .from("agent_events")
                .update({
                  processed_at: new Date().toISOString(),
                  processed_by: "rx-notify",
                  last_error: anySent ? null : "no_delivery_succeeded",
                })
                .eq("id", ev.id as string);

              if (anySent) sent++;
              else failed++;
              results.push({ rx: rxId, ok: anySent });
            } catch (e) {
              failed++;
              const msg = e instanceof Error ? e.message : String(e);
              results.push({ rx: rxId, ok: false, error: msg });
              await supabaseAdmin
                .from("agent_events")
                .update({
                  retry_count: ((ev as { retry_count?: number }).retry_count ?? 0) + 1,
                  last_error: msg,
                })
                .eq("id", ev.id as string);
            }
          }

          return Response.json({ ok: true, picked: events.length, sent, failed, results });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
      GET: async () =>
        Response.json({
          ok: true,
          hint: "POST with x-cron-secret to dispatch pending prescription WhatsApp notifications.",
        }),
    },
  },
});
