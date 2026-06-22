// Quick health-check (database + env + whatsapp). Gated by anon key.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health/quick-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runQuickHealthCheck } = await import("@/lib/health-check.server");
        const result = await runQuickHealthCheck();
        return Response.json(result, {
          status: result.status === "unhealthy" ? 503 : 200,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
