import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";
import { world } from "@/ai/integration/bootstrap";
import { runHealthCheck } from "@/ai/integration/core/health-monitor";

/**
 * POST /api/public/ai/world-health
 * Cron-authenticated. Pings every registered connector and writes
 * one row per system into ai_world_health.
 */
export const Route = createFileRoute("/api/public/ai/world-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const summary = await runHealthCheck(world, supabaseAdmin);
        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
