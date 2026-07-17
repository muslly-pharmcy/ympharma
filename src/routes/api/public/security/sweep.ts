import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

/**
 * POST /api/public/security/sweep
 *
 * Nightly sweep — scans the last 24h of error_logs and identity_audit_events
 * for anomalies and records any spikes as ai_security_events rows.
 */
export const Route = createFileRoute("/api/public/security/sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { SecurityEngine } = await import(
          "@/security/ai/core/security-engine"
        );

        const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
        const [errs, ident] = await Promise.all([
          supabaseAdmin
            .from("error_logs")
            .select("id, created_at, message")
            .gte("created_at", since),
          supabaseAdmin
            .from("identity_audit_events")
            .select("id, event_type, created_at")
            .gte("created_at", since),
        ]);

        const errCount = errs.data?.length ?? 0;
        const identCount = ident.data?.length ?? 0;

        const inserts: Array<{
          event_type: string;
          severity: string;
          source: string;
          details: Record<string, unknown>;
          risk_score: number;
          action_taken: string;
        }> = [];
        const engine = new SecurityEngine();

        if (errCount > 50) {
          const risk = engine.analyze({
            type: "SYSTEM_ANOMALY",
            details: { attempts: errCount },
          });
          inserts.push({
            event_type: "SYSTEM_ANOMALY",
            severity: risk.severity,
            source: "sweep",
            details: { error_count: errCount, window: "24h" },
            risk_score: risk.score,
            action_taken: risk.action,
          });
        }

        // Failed identity attempts spike
        const failed = (ident.data ?? []).filter((r) =>
          String(r.event_type ?? "").toLowerCase().includes("fail"),
        ).length;
        if (failed > 10) {
          const risk = engine.analyze({
            type: "LOGIN_FAILED",
            details: { attempts: failed },
          });
          inserts.push({
            event_type: "LOGIN_FAILED",
            severity: risk.severity,
            source: "sweep",
            details: { failed_attempts: failed, window: "24h" },
            risk_score: risk.score,
            action_taken: risk.action,
          });
        }

        if (inserts.length) {
          await supabaseAdmin
            .from("ai_security_events")
            .insert(inserts as never);
        }

        return Response.json({
          ok: true,
          scanned: { errors: errCount, identity_events: identCount },
          inserted: inserts.length,
        });
      },
    },
  },
});
