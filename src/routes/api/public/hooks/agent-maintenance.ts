// Daily maintenance cron — Phase 3.
// Runs telemetry cleanup, confidence calibration, and insight aggregation.
// Each step is independent and never blocks the others (P3-GATE-05).
// Protected by the shared CRON_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/agent-maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        const results: Record<string, unknown> = {};

        try {
          const { cleanTelemetry } = await import("@/lib/agent/telemetry.cleanup.server");
          results.cleanup = await cleanTelemetry();
        } catch (e) {
          results.cleanup = { ok: false, reason: (e as Error).message };
        }

        try {
          const { analyzeConfidenceCalibration } = await import(
            "@/lib/agent/feedback.analyzer.server"
          );
          results.calibration = await analyzeConfidenceCalibration(7);
        } catch (e) {
          results.calibration = { ok: false, reason: (e as Error).message };
        }

        try {
          const { generateInsights } = await import("@/lib/agent/feedback.collector.server");
          results.insights = await generateInsights(7);
        } catch (e) {
          results.insights = { ok: false, reason: (e as Error).message };
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});
