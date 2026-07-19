// Cron-triggered: asks n8n to refresh engagement stats for recently-published posts.
// n8n then calls /api/public/hooks/social-callback with event=stats (HMAC-signed) per post.
// Protected by the project's shared CRON_SECRET (x-cron-secret header).
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/collect-social-stats")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        const url = process.env.N8N_STATS_WEBHOOK_URL ?? process.env.N8N_WEBHOOK_URL;
        if (!url) {
          return new Response(
            JSON.stringify({ ok: false, error: "N8N webhook URL not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Refresh stats for posts published in the last 14 days that have an external_id.
          const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
          const { data: rows, error } = await supabaseAdmin
            .from("social_posts")
            .select("id,platform,external_id")
            .eq("status", "published")
            .not("external_id", "is", null)
            .gte("published_at", since)
            .limit(200);
          if (error) throw new Error(error.message);

          const items = (rows ?? []).map((r) => ({
            post_id: r.id,
            platform: r.platform,
            external_id: r.external_id,
          }));
          if (items.length === 0) {
            return Response.json({ ok: true, requested: 0 });
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25_000);
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "stats_refresh", items }),
              signal: controller.signal,
            });
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              throw new Error(`n8n HTTP ${res.status}: ${text.slice(0, 300)}`);
            }
          } finally {
            clearTimeout(timeout);
          }

          return Response.json({ ok: true, requested: items.length });
        } catch (e) {
          console.error("[collect-social-stats]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
