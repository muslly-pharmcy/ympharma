// Hourly self-heal sweep — safe maintenance only:
//  1) retry failed social_posts (delegates to publishPostById, bounded)
//  2) expire stuck inventory_reservation_state rows older than 30 minutes
//  3) re-queue agent_events_dlq items under retry_count<5 by clearing failed_at
// Auth: x-cron-secret.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { hourlyCronExpired, expiredResponse } from "@/lib/hourly-guard";

const SOCIAL_BATCH = 10;
const DLQ_BATCH = 25;
const RESERVATION_TIMEOUT_MIN = 30;

export const Route = createFileRoute("/api/public/hooks/hourly-self-heal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;
        if (hourlyCronExpired()) return expiredResponse();

        const summary = { social_retried: 0, reservations_expired: 0, dlq_requeued: 0, errors: [] as string[] };

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1) Social posts retry
          try {
            const { publishPostById } = await import("@/lib/social-publisher.server");
            const nowIso = new Date().toISOString();
            const { data: posts } = await supabaseAdmin
              .from("social_posts")
              .select("id")
              .eq("status", "failed")
              .lt("attempt_count", 5)
              .or(`next_retry_at.is.null,next_retry_at.lt.${nowIso}`)
              .limit(SOCIAL_BATCH);
            for (const p of posts ?? []) {
              try { await publishPostById(p.id, "cron"); summary.social_retried += 1; }
              catch (e) { summary.errors.push(`social ${p.id}: ${(e as Error).message}`); }
            }
          } catch (e) { summary.errors.push(`social-block: ${(e as Error).message}`); }

          // 2) Expire stale reservations
          try {
            const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT_MIN * 60_000).toISOString();
            const { data: expired, error: expErr } = await supabaseAdmin
              .from("inventory_reservation_state")
              .update({ state: "expired", released_at: new Date().toISOString() })
              .eq("state", "reserved")
              .lt("reserved_at", cutoff)
              .select("order_id");
            if (expErr) summary.errors.push(`reservations: ${expErr.message}`);
            else summary.reservations_expired = expired?.length ?? 0;
          } catch (e) { summary.errors.push(`reservations-block: ${(e as Error).message}`); }

          // 3) Re-queue low-retry DLQ items
          try {
            const { data: dlq } = await supabaseAdmin
              .from("agent_events_dlq")
              .select("id")
              .lt("retry_count", 5)
              .is("resolved_at", null)
              .limit(DLQ_BATCH);
            for (const row of dlq ?? []) {
              const { error: upErr } = await supabaseAdmin
                .from("agent_events_dlq")
                .update({ failed_at: null, retry_count: ((row as { retry_count?: number }).retry_count ?? 0) + 1 })
                .eq("id", row.id);
              if (!upErr) summary.dlq_requeued += 1;
            }
          } catch (e) { summary.errors.push(`dlq-block: ${(e as Error).message}`); }

          return Response.json({ ok: true, ...summary });
        } catch (e) {
          console.error("[cron hourly-self-heal]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message, summary }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
