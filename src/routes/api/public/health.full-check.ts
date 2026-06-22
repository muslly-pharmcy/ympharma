// Full health-check endpoint — gated by the project's anon key (apikey header)
// to match the existing cron/webhook auth pattern in this codebase.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health/full-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runFullHealthCheck } = await import("@/lib/health-check.server");
        const result = await runFullHealthCheck();
        return Response.json(result, {
          status: result.status === "unhealthy" ? 503 : 200,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
