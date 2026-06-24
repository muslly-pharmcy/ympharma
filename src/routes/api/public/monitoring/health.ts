// Public monitoring snapshot — no PII, counts only.
// GET /api/public/monitoring/health
import { createFileRoute } from "@tanstack/react-router";

type CheckStatus = "ok" | "warning" | "critical" | "error";
type Check = { status: CheckStatus; [k: string]: unknown };

export const Route = createFileRoute("/api/public/monitoring/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const checks: Record<string, Check> = {};

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
          const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

          const [
            dbPing,
            pendingEvents,
            dlqRecent,
            recentErrors,
            lowStock,
          ] = await Promise.all([
            supabaseAdmin.from("products").select("id", { head: true, count: "exact" }).limit(1),
            supabaseAdmin
              .from("agent_events")
              .select("id", { head: true, count: "exact" })
              .is("processed_at", null),
            supabaseAdmin
              .from("agent_events_dlq")
              .select("id", { head: true, count: "exact" })
              .gt("created_at", oneHourAgo),
            supabaseAdmin
              .from("error_logs")
              .select("id", { head: true, count: "exact" })
              .gt("created_at", fiveMinAgo),
            supabaseAdmin
              .from("products")
              .select("id", { head: true, count: "exact" })
              .lt("stock_qty", 5),
          ]);

          checks.database = dbPing.error
            ? { status: "error", message: dbPing.error.message }
            : { status: "ok" };

          const pending = pendingEvents.count ?? 0;
          checks.event_queue = {
            status: pending > 1000 ? "critical" : pending > 200 ? "warning" : "ok",
            pending,
          };

          const dlq = dlqRecent.count ?? 0;
          checks.dlq = {
            status: dlq > 20 ? "critical" : dlq > 0 ? "warning" : "ok",
            last_hour: dlq,
          };

          const errs = recentErrors.count ?? 0;
          checks.error_rate = {
            status: errs > 50 ? "critical" : errs > 10 ? "warning" : "ok",
            errors_5min: errs,
          };

          const low = lowStock.count ?? 0;
          checks.low_stock = {
            status: low > 50 ? "warning" : "ok",
            count_below_5: low,
          };
        } catch (e) {
          checks.snapshot = {
            status: "error",
            message: e instanceof Error ? e.message : String(e),
          };
        }

        const statuses = Object.values(checks).map((c) => c.status);
        const overall: CheckStatus = statuses.includes("critical")
          ? "critical"
          : statuses.includes("error")
            ? "error"
            : statuses.includes("warning")
              ? "warning"
              : "ok";

        return Response.json({
          ok: true,
          overall_status: overall,
          timestamp: new Date().toISOString(),
          elapsed_ms: Date.now() - started,
          checks,
        });
      },
    },
  },
});
