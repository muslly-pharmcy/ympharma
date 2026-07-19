import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/run-reactivation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        try {
          const { runReactivationCron } = await import("@/lib/marketing-cron.server");
          const result = await runReactivationCron({ days: 30, limit: 100 });
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron run-reactivation]", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
