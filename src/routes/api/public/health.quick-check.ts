// Quick health-check — protected by CRON_SECRET (server-only).
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/health/quick-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
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
