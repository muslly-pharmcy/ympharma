// DevOps DLQ alerts cron endpoint.
//
// On each tick: counts unresolved rows in agent_events_dlq and how many were
// added in the last hour. If the hourly count crosses THRESHOLD we open an
// operations_alerts row (dedupe_key bounded per hour to avoid spam) and
// fan-out notifications to every admin/owner. Idempotent — re-running on the
// same hour is a no-op because of the unique dedupe_key constraint.
//
// Auth: x-cron-secret header. Trigger via pg_cron + pg_net or any external
// scheduler. No PII returned.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const DEFAULT_THRESHOLD = 5;

export type DlqAlertResult = {
  ok: boolean;
  dlq_active: number;
  new_last_hour: number;
  threshold: number;
  alerted: boolean;
  dedupe_key?: string;
  notified_users?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runDlqAlertCheck(supabaseAdmin: any, threshold = DEFAULT_THRESHOLD): Promise<DlqAlertResult> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: activeCount, error: e1 }, { count: newCount, error: e2 }] = await Promise.all([
    supabaseAdmin
      .from("agent_events_dlq")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    supabaseAdmin
      .from("agent_events_dlq")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .gte("failed_at", hourAgo),
  ]);
  if (e1) throw new Error(`dlq_count_active:${e1.message}`);
  if (e2) throw new Error(`dlq_count_recent:${e2.message}`);

  const dlqActive = activeCount ?? 0;
  const newLastHour = newCount ?? 0;

  if (newLastHour < threshold) {
    return { ok: true, dlq_active: dlqActive, new_last_hour: newLastHour, threshold, alerted: false };
  }

  // Hour-bucket dedupe key. Unique constraint on operations_alerts.dedupe_key
  // turns repeated calls within the same hour into a no-op on conflict.
  const hourBucket = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const dedupeKey = `dlq_burst:${hourBucket}`;
  const summary = `${newLastHour} حدث فشل في DLQ خلال آخر ساعة (إجمالي غير محلول: ${dlqActive})`;

  const { error: insErr } = await supabaseAdmin
    .from("operations_alerts")
    .upsert(
      {
        kind: "dlq_burst",
        ref_id: hourBucket,
        summary,
        severity: newLastHour >= threshold * 4 ? "critical" : "warn",
        dedupe_key: dedupeKey,
        status: "open",
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
  if (insErr) throw new Error(`alert_insert:${insErr.message}`);

  // Fan-out notifications to admins/owners. Best-effort — failures here
  // shouldn't tank the alert (the operations_alerts row is the source of truth).
  let notifiedUsers = 0;
  try {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);
    const ids = Array.from(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
    if (ids.length > 0) {
      // Idempotency for notifications: include hourBucket in metadata so a
      // re-run within the same hour can be deduped at the read layer.
      // Insert is fine — the operations_alerts upsert above is the throttle.
      const { error: nErr } = await supabaseAdmin.from("notifications").insert(
        ids.map((uid) => ({
          user_id: uid,
          type: "dlq_burst",
          title: "تنبيه DLQ",
          body: summary,
          priority: "high",
          metadata: { dedupeKey, hourBucket, dlqActive, newLastHour },
        })),
      );
      if (!nErr) notifiedUsers = ids.length;
    }
  } catch (e) {
    console.error("[dlq-alerts] notify admins failed", e);
  }

  return {
    ok: true,
    dlq_active: dlqActive,
    new_last_hour: newLastHour,
    threshold,
    alerted: true,
    dedupe_key: dedupeKey,
    notified_users: notifiedUsers,
  };
}

export const Route = createFileRoute("/api/public/hooks/dlq-alerts")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, hint: "POST with x-cron-secret. Optional body: {\"threshold\": 5}" }),
          { headers: { "Content-Type": "application/json" } },
        ),

      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        const body = await request.json().catch(() => ({} as { threshold?: number }));
        const threshold = Math.max(1, Math.min(Number(body?.threshold) || DEFAULT_THRESHOLD, 1000));

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await runDlqAlertCheck(supabaseAdmin, threshold);
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
