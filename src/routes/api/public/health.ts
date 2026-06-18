import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Public health endpoint — used by external uptime monitors (UptimeRobot, BetterStack)
// and internal pg_cron heartbeats. Returns JSON with DB connectivity check.
// CORS open so monitors can call from any region.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "no-store",
};

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const start = Date.now();
        const url = new URL(request.url);
        const log = url.searchParams.get("log") === "1";
        const region =
          request.headers.get("cf-ipcountry") ||
          request.headers.get("x-vercel-ip-country") ||
          "unknown";

        let dbOk = false;
        let dbError: string | null = null;
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
          );
          const { error } = await supabase
            .from("uptime_checks")
            .select("id", { count: "exact", head: true })
            .limit(1);
          if (error) {
            dbError = error.message;
          } else {
            dbOk = true;
          }
        } catch (e) {
          dbError = e instanceof Error ? e.message : String(e);
        }

        const latency = Date.now() - start;
        const ok = dbOk;

        // Optional: persist the heartbeat to uptime_checks (called from pg_cron).
        if (log) {
          try {
            const admin = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { persistSession: false, autoRefreshToken: false } }
            );
            await admin.from("uptime_checks").insert({
              ok,
              latency_ms: latency,
              region,
              error: dbError,
            });
          } catch {
            /* swallow */
          }
        }

        return Response.json(
          {
            status: ok ? "ok" : "degraded",
            db: dbOk,
            latency_ms: latency,
            region,
            time: new Date().toISOString(),
            error: dbError,
          },
          { status: ok ? 200 : 503, headers: CORS }
        );
      },
    },
  },
});
