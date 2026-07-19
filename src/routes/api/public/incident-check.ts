import { createFileRoute } from "@tanstack/react-router";
import { dispatchOpenIncidentAlerts } from "@/lib/incident-alerts.functions";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

/**
 * Called periodically by pg_cron (or external scheduler) to dispatch
 * throttled WhatsApp alerts for open incidents.
 * Protected by `x-cron-secret` header matching server-only CRON_SECRET.
 */
export const Route = createFileRoute("/api/public/incident-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        const result = await dispatchOpenIncidentAlerts();
        return Response.json(result);
      },
      GET: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        const result = await dispatchOpenIncidentAlerts();
        return Response.json(result);
      },
    },
  },
});
