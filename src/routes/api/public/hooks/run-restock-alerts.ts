import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/run-restock-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        try {
          const { runRestockAlertsCron } = await import("@/lib/marketing-cron.server");
          const result = await runRestockAlertsCron();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron run-restock-alerts]", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
