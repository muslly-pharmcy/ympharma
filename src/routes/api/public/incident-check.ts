import { createFileRoute } from "@tanstack/react-router";
import { dispatchOpenIncidentAlerts } from "@/lib/incident-alerts.functions";

/**
 * Called periodically by pg_cron (or external scheduler) to dispatch
 * throttled WhatsApp alerts for open incidents.
 * Protected by apikey query/header matching SUPABASE anon key.
 */
export const Route = createFileRoute("/api/public/incident-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const url = new URL(request.url);
        const key = request.headers.get("apikey") || url.searchParams.get("apikey");
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await dispatchOpenIncidentAlerts();
        return Response.json(result);
      },
      GET: async ({ request }) => {
        // Allow GET with apikey query string for easier scheduling.
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const url = new URL(request.url);
        const key = url.searchParams.get("apikey");
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await dispatchOpenIncidentAlerts();
        return Response.json(result);
      },
    },
  },
});
