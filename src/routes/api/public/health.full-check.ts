// Full health-check endpoint — protected by CRON_SECRET (server-only) to match
// the rest of the cron/hook authentication pattern.
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/health/full-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
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
