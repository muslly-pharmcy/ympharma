// Hourly health scan: runs the quick health probe, persists to health_checks,
// raises a deduped operations_alerts_v14 row when degraded/failed.
// Auth: x-cron-secret. End-date: see HOURLY_CRON_END_AT.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { hourlyCronExpired, expiredResponse } from "@/lib/hourly-guard";

export const Route = createFileRoute("/api/public/hooks/hourly-health-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;
        if (hourlyCronExpired()) return expiredResponse();

        try {
          const { runQuickHealthCheck } = await import("@/lib/health-check.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const report = await runQuickHealthCheck();

          await supabaseAdmin.from("health_checks").insert({
            status: report.status,
            duration: report.duration,
            passed: report.summary.passed,
            failed: report.summary.failed,
            warnings: report.summary.warnings,
            total: report.summary.total,
            details: JSON.parse(JSON.stringify(report)),
          });

          let alerted = false;
          if (report.status !== "healthy") {
            const dedupeKey = `hourly-health:${report.status}:${new Date().toISOString().slice(0, 13)}`;
            const { error: alertErr } = await supabaseAdmin.from("operations_alerts_v14").insert({
              alert_type: "hourly_health_scan",
              message: `Health scan reported ${report.status} (failed=${report.summary.failed}, warnings=${report.summary.warnings})`,
              dedupe_key: dedupeKey,
            });
            alerted = !alertErr;
          }

          return Response.json({
            ok: true,
            status: report.status,
            failed: report.summary.failed,
            warnings: report.summary.warnings,
            alerted,
          });
        } catch (e) {
          console.error("[cron hourly-health-scan]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
