// Daily cron endpoint: generates posts via DeepSeek, inserts them, then
// forwards each one to the n8n webhook. Protected by the project's shared
// CRON_SECRET (x-cron-secret header) — `/api/public/*` bypasses platform auth.
//
// F-02: bounded concurrency (max 3) for publish — avoids 30s Worker wall-time.
// F-07: drafts inserted one-by-one to guarantee correct decision↔post linkage
//       (no positional-array assumption).
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

const PUBLISH_CONCURRENCY = 3;

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<Array<{ status: "fulfilled" | "rejected"; value?: R; reason?: unknown }>> {
  const results: Array<{ status: "fulfilled" | "rejected"; value?: R; reason?: unknown }> = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = { status: "fulfilled", value: await worker(items[i]) };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export const Route = createFileRoute("/api/public/hooks/run-social-posts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        try {
          const { generateDailyDrafts } = await import("@/lib/social-content.server");
          const { publishPostById } = await import("@/lib/social-publisher.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { drafts, decisions } = await generateDailyDrafts();
          if (drafts.length === 0) {
            return Response.json({ ok: true, generated: 0, published: 0, failed: 0 });
          }

          // F-07: insert per-draft so the returned id can be paired with its
          // exact decision record, with no reliance on RETURNING ordering.
          const insertedIds: string[] = [];
          for (let i = 0; i < drafts.length; i++) {
            const { data, error } = await supabaseAdmin
              .from("social_posts")
              .insert(drafts[i])
              .select("id")
              .single();
            if (error || !data) {
              console.error("[cron] draft insert failed:", error?.message, drafts[i].platform);
              continue;
            }
            insertedIds.push(data.id);
            const decision = decisions[i];
            if (decision) {
              const { error: telErr } = await supabaseAdmin
                .from("agent_decisions")
                .insert({ ...decision, post_id: data.id } as any);
              if (telErr) console.warn("[cron] telemetry insert failed:", telErr.message);
            }
          }

          // F-02: bounded concurrency keeps total wall-time under Worker limits.
          const results = await runWithConcurrency(insertedIds, PUBLISH_CONCURRENCY, (id) =>
            publishPostById(id, "cron"),
          );

          let published = 0;
          let failed = 0;
          for (const r of results) {
            if (r.status === "fulfilled" && r.value?.ok) published += 1;
            else failed += 1;
          }

          return Response.json({
            ok: true,
            generated: drafts.length,
            inserted: insertedIds.length,
            published,
            failed,
          });
        } catch (e) {
          console.error("[cron run-social-posts]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
