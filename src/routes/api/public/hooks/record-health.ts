// Cron-driven: runs a quick health probe and persists the result to public.health_checks.
// Schedule recommendation: every 5 minutes.
// Auth: x-cron-secret (verifyCronSecret).
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/record-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        try {
          const { runQuickHealthCheck } = await import("@/lib/health-check.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const report = await runQuickHealthCheck();

          const { error } = await supabaseAdmin.from("health_checks").insert({
            status: report.status,
            duration: report.duration,
            passed: report.summary.passed,
            failed: report.summary.failed,
            warnings: report.summary.warnings,
            total: report.summary.total,
            details: JSON.parse(JSON.stringify(report)),
          });

          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return Response.json({
            ok: true,
            status: report.status,
            passed: report.summary.passed,
            failed: report.summary.failed,
            warnings: report.summary.warnings,
          });
        } catch (e) {
          console.error("[cron record-health]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
