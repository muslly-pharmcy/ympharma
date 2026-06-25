// src/routes/api/public/hooks/dlq-alerts.ts
// DLQ ALERTS — uses real agent_events_dlq columns + operations_alerts_v14
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runDlqAlertCheck(supabaseAdmin: any) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const { data: failedEvents, error: fetchError } = await supabaseAdmin
    .from("agent_events_dlq")
    .select("id, event_name, last_error, failed_at, resolved_at")
    .gte("failed_at", oneHourAgo)
    .is("resolved_at", null)
    .order("failed_at", { ascending: false });

  if (fetchError) {
    return { ok: false, error: fetchError.message, alerts_sent: 0, failed_count: 0, errors: [] };
  }

  const results = {
    ok: true,
    alerts_sent: 0,
    failed_count: failedEvents?.length || 0,
    errors: [] as Array<{ id: string; event: string; error: string }>,
  };

  if (failedEvents && failedEvents.length > 0) {
    const message =
      `🚨 [DLQ Alert] ${failedEvents.length} حدثاً فاشلاً خلال الساعة الأخيرة.\n` +
      failedEvents
        .map((e: any, i: number) => `${i + 1}. ${e.event_name}: ${(e.last_error || "").slice(0, 100)}`)
        .join("\n");

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    if (admins && admins.length > 0) {
      const dedupeKey = `dlq_burst:${new Date().toISOString().slice(0, 13)}`;
      for (const admin of admins) {
        const { error: insertError } = await supabaseAdmin
          .from("operations_alerts_v14")
          .upsert(
            {
              user_id: admin.user_id,
              alert_type: "dlq_burst",
              message,
              dedupe_key: dedupeKey,
              created_at: new Date().toISOString(),
            },
            { onConflict: "user_id, dedupe_key", ignoreDuplicates: true },
          );
        if (!insertError) results.alerts_sent++;
      }
    }

    results.errors = failedEvents.map((e: any) => ({
      id: e.id,
      event: e.event_name,
      error: e.last_error,
    }));
  }

  return results;
}

export const Route = createFileRoute("/api/public/hooks/dlq-alerts")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST with x-cron-secret" }), {
          headers: { "Content-Type": "application/json" },
        }),
      POST: async ({ request }) => {
        const authResponse = verifyCronSecret(request);
        if (authResponse) return authResponse;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const result = await runDlqAlertCheck(supabaseAdmin);
        return Response.json(result);
      },
    },
  },
});
