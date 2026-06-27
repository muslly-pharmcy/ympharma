// Daily backup verification hook — invoked by pg_cron via pg_net.
// Auth: x-cron-secret. Persists run history and alerts on integrity failures.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { withObservability } from "@/core/observability/withObservability";
import { BackupVerificationService } from "@/core/backup/BackupVerificationService";
import { logger } from "@/core/observability/Logger";

export const Route = createFileRoute("/api/public/hooks/backup-verify")({
  server: {
    handlers: {
      POST: withObservability("hooks.backup-verify", async ({ request, ctx }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        const log = logger.withContext(ctx);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const service = new BackupVerificationService(supabaseAdmin);
        let report;
        try {
          report = await service.verify(10);
        } catch (e) {
          log.error("backup_verify.failed", { err: (e as Error).message });
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message, correlation_id: ctx.correlation_id }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        // Persist run
        await supabaseAdmin.from("backup_verification_runs" as never).insert({
          source: "cron",
          checked: report.checked,
          passed: report.passed,
          failed: report.failed,
          freshness_ok: report.freshness_ok,
          results: report.results as never,
          correlation_id: ctx.correlation_id,
        } as never);

        // Alert if integrity is compromised
        const integrityFailed = report.failed > 0 || !report.freshness_ok;
        if (integrityFailed) {
          try {
            const { sendSlack } = await import("@/lib/alert-dispatch.server");
            const msg = `Backup verify: ${report.failed}/${report.checked} failed${report.freshness_ok ? "" : ", latest daily is stale"}`;
            await sendSlack({
              agent: "backup-verify",
              severity: report.failed > 0 ? "critical" : "high",
              message: msg,
              reportUrl: "/admin-backup-verify",
            });
            log.warn("backup_verify.alerted", { failed: report.failed, freshness_ok: report.freshness_ok });
          } catch (e) {
            log.error("backup_verify.alert_failed", { err: (e as Error).message });
          }
        }

        return new Response(
          JSON.stringify({ correlation_id: ctx.correlation_id, ...report }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    },
  },
});
