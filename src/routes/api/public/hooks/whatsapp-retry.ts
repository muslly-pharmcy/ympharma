// Phase 6C — retry worker for failed WhatsApp dispatches.
// Picks up rows with status in (failed, error) whose attempts < 3 and
// next_retry_at <= now, replays the send via Meta Cloud API, then updates
// attempts / next_retry_at / status. Exponential backoff: 5m, 15m, 45m.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const MAX_ATTEMPTS = 3;
const BACKOFF_MIN = [5, 15, 45]; // minutes per attempt #

async function run(request: Request): Promise<Response> {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiToken = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !apiToken) {
    return Response.json({ ok: false, error: "missing_whatsapp_env" }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("whatsapp_delivery_logs")
    .select("id, recipient_phone, payload, attempts, message_kind")
    .in("status", ["failed", "error"])
    .lt("attempts", MAX_ATTEMPTS)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  let retried = 0;
  let recovered = 0;
  let exhausted = 0;

  for (const row of rows ?? []) {
    const payload = (row as { payload: Record<string, unknown> }).payload ?? {};
    // payload is expected to be the full Meta send body OR { text: string }.
    const body =
      payload.messaging_product
        ? payload
        : {
            messaging_product: "whatsapp",
            to: row.recipient_phone,
            type: "text",
            text: { body: String((payload as { text?: string }).text ?? "").slice(0, 4000) },
          };

    let ok = false;
    let wamid: string | null = null;
    let errMsg: string | null = null;
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { messages?: Array<{ id: string }>; error?: { message: string } }
        | null;
      ok = res.ok;
      wamid = json?.messages?.[0]?.id ?? null;
      errMsg = json?.error?.message ?? (res.ok ? null : `http_${res.status}`);
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "fetch_failed";
    }

    const nextAttempt = (row as { attempts: number }).attempts + 1;
    const patch: Record<string, unknown> = {
      attempts: nextAttempt,
      last_attempt_at: new Date().toISOString(),
    };
    if (ok) {
      patch.status = "sent";
      patch.wamid = wamid;
      patch.sent_at = new Date().toISOString();
      patch.error_message = null;
      patch.next_retry_at = null;
      recovered += 1;
    } else {
      patch.error_message = errMsg;
      if (nextAttempt >= MAX_ATTEMPTS) {
        patch.status = "dead_letter";
        patch.failed_at = new Date().toISOString();
        patch.next_retry_at = null;
        exhausted += 1;
      } else {
        const mins = BACKOFF_MIN[nextAttempt - 1] ?? 45;
        patch.next_retry_at = new Date(Date.now() + mins * 60_000).toISOString();
        patch.status = "failed";
      }
    }
    await supabaseAdmin.from("whatsapp_delivery_logs").update(patch as never).eq("id", (row as { id: string }).id);
    retried += 1;
  }

  return Response.json({ ok: true, retried, recovered, exhausted });
}

export const Route = createFileRoute("/api/public/hooks/whatsapp-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, hint: "POST with x-cron-secret header" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
