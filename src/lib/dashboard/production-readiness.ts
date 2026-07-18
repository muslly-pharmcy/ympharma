// REPORT-P4-005 — Production readiness aggregator (server-only).
// Combines health-check subsystems, integrations, cron freshness, and error
// backlog into a single summary DTO for the readiness dashboard.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAllIntegrations, summarizeIntegrations, type IntegrationHealth } from "@/lib/health-checks/integrations";
import { getApiStats, type RouteStats } from "@/lib/monitoring/api-monitor";

export type ReadinessCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
};

export type ReadinessSnapshot = {
  overall: "pass" | "warn" | "fail";
  generatedAt: string;
  checks: ReadinessCheck[];
  integrations: IntegrationHealth[];
  api: RouteStats[];
  cron: { name: string; lastRun: string | null; ok: boolean }[];
  recentErrors: number;
};

function worst(items: readonly ReadinessCheck["status"][]): "pass" | "warn" | "fail" {
  if (items.includes("fail")) return "fail";
  if (items.includes("warn")) return "warn";
  return "pass";
}

export const getProductionReadinessSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReadinessSnapshot> => {
    const supabase = context.supabase;

    // Admin/owner gate
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    // Integrations
    const integrations = await checkAllIntegrations();
    const intSummary = summarizeIntegrations(integrations);

    // Cron freshness (from ai_world_health high-water marks)
    const { data: worldHealth } = await supabase
      .from("ai_world_health")
      .select("system_name, checked_at, status")
      .order("checked_at", { ascending: false })
      .limit(20);

    const cron = ((worldHealth ?? []) as Array<{ system_name: string; checked_at: string; status: string }>).map((r) => ({
      name: r.system_name,
      lastRun: r.checked_at ?? null,
      ok: r.status === "ok" || r.status === "healthy",
    }));

    // Recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: errorCount } = await supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", oneHourAgo);

    const recentErrors = errorCount ?? 0;

    const checks: ReadinessCheck[] = [
      {
        key: "integrations",
        label: "Third-party integrations",
        status: intSummary.down.length ? "fail" : intSummary.degraded.length ? "warn" : "pass",
        detail: intSummary.down.length
          ? `Down: ${intSummary.down.join(", ")}`
          : intSummary.degraded.length
            ? `Degraded: ${intSummary.degraded.join(", ")}`
            : "All up",
      },
      {
        key: "errors",
        label: "Error rate (last hour)",
        status: recentErrors > 100 ? "fail" : recentErrors > 20 ? "warn" : "pass",
        detail: `${recentErrors} errors`,
      },
      {
        key: "cron",
        label: "Background jobs",
        status: cron.every((c) => c.ok) ? "pass" : "warn",
        detail: `${cron.filter((c) => c.ok).length}/${cron.length} healthy`,
      },
    ];

    return {
      overall: worst(checks.map((c) => c.status)),
      generatedAt: new Date().toISOString(),
      checks,
      integrations,
      api: getApiStats(),
      cron,
      recentErrors,
    };
  });
