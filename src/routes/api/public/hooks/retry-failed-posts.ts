// F-03 — Self-healing retry for failed social posts.
// Cron-driven endpoint. Picks rows with status='failed' AND attempt_count<3,
// then re-invokes publishPostById with bounded concurrency. publishPostById
// already increments attempt_count and logs each attempt to
// `social_post_attempts`, so this hook only orchestrates selection + dispatch.
//
// Auth: x-cron-secret. Schedule recommendation: every 15 minutes.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 25;
const CONCURRENCY = 3;
// Exponential backoff in minutes per attempt index (1..5).
// 5min, 15min, 45min, 2h, 6h. Capped at 6h.
function backoffMinutes(attempt: number): number {
  const ladder = [5, 15, 45, 120, 360];
  return ladder[Math.min(attempt, ladder.length - 1)] ?? 360;
}


async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        out[i] = await worker(items[i]);
      } catch (e) {
        out[i] = { ok: false, error: (e as Error).message } as unknown as R;
      }
    }
  });
  await Promise.all(runners);
  return out;
}

export const Route = createFileRoute("/api/public/hooks/retry-failed-posts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { publishPostById } = await import("@/lib/social-publisher.server");

          const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();
          const { data: rows, error } = await supabaseAdmin
            .from("social_posts")
            .select("id,attempt_count,last_attempt_at")
            .eq("status", "failed")
            .lt("attempt_count", MAX_ATTEMPTS)
            .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
            .order("last_attempt_at", { ascending: true, nullsFirst: true })
            .limit(BATCH_LIMIT);

          if (error) {
            return new Response(
              JSON.stringify({ ok: false, error: error.message }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
          if (!rows || rows.length === 0) {
            return Response.json({ ok: true, picked: 0, retried: 0, succeeded: 0, failed: 0 });
          }

          const results = await runWithConcurrency(rows, CONCURRENCY, (row) =>
            publishPostById(row.id, "cron"),
          );

          let succeeded = 0;
          let failed = 0;
          for (const r of results) {
            if (r?.ok && !r.idempotent) succeeded += 1;
            else if (!r?.ok) failed += 1;
          }

          return Response.json({
            ok: true,
            picked: rows.length,
            retried: results.length,
            succeeded,
            failed,
            max_attempts: MAX_ATTEMPTS,
          });
        } catch (e) {
          console.error("[cron retry-failed-posts]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
