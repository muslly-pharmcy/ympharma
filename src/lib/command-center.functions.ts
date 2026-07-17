import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * AI Command Center — read-only aggregation over the existing AI tables.
 * No new schema. Admin-only via has_role(admin|owner).
 */

export interface AgentSummary {
  code: string;
  name: string;
  category: string | null;
  health: string | null;
  enabled: boolean;
  last_dispatched_at: string | null;
}

export interface WorldSystem {
  system_name: string;
  status: string;
  checked_at: string;
  metrics: unknown;
}

export interface EventRow {
  id: string;
  event_type: string;
  source: string;
  priority: string | null;
  status: string;
  created_at: string;
  target_agent: string | null;
}

export interface DecisionRow {
  id: string;
  event_id: string | null;
  agent_name: string;
  decision_type: string | null;
  confidence: number | null;
  created_at: string;
}

export interface RunRow {
  id: string;
  agent: string;
  kind: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  summary: string | null;
  execution_time_ms: number | null;
}

export interface ForecastRow {
  product_id: string;
  horizon_days: number;
  expected_units: number;
  confidence: number | null;
  computed_at: string;
}

export interface ExpiryAlert {
  batch_id: string;
  tier: string;
  qty_at_alert: number;
  expiry_date: string;
  created_at: string;
}

export interface CommandCenterSnapshot {
  brain: {
    online: boolean;
    last_orchestrator_run: string | null;
    orchestrator_status: string | null;
  };
  agents: AgentSummary[];
  world: WorldSystem[];
  events: EventRow[];
  decisions: DecisionRow[];
  runs: RunRow[];
  forecasts: ForecastRow[];
  expiries: ExpiryAlert[];
  counts: {
    pending_events: number;
    pending_approvals: number;
    decisions_last_24h: number;
  };
}

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data: adminFlag, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw error;
  if (adminFlag) return;
  const { data: ownerFlag, error: ownerErr } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "owner",
  });
  if (ownerErr) throw ownerErr;
  if (!ownerFlag) throw new Error("Forbidden: admin or owner role required");
}

export const getCommandCenterSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommandCenterSnapshot> => {
    await assertAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [
      agentsRes,
      worldRes,
      eventsRes,
      decisionsRes,
      runsRes,
      forecastsRes,
      expiriesRes,
      pendingEventsRes,
      pendingApprovalsRes,
      decisionsCountRes,
    ] = await Promise.all([
      s
        .from("ai_agents")
        .select("code, name, category, health, enabled, last_dispatched_at")
        .order("code", { ascending: true }),
      s
        .from("ai_world_health")
        .select("system_name, status, checked_at, metrics")
        .order("checked_at", { ascending: false }),
      s
        .from("ai_events")
        .select("id, event_type, source, priority, status, created_at, target_agent")
        .order("created_at", { ascending: false })
        .limit(20),
      s
        .from("ai_decisions")
        .select("id, event_id, agent_name, decision_type, confidence, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      s
        .from("agent_runs")
        .select("id, agent, kind, status, started_at, finished_at, summary, execution_time_ms")
        .order("started_at", { ascending: false })
        .limit(15),
      s
        .from("demand_forecasts")
        .select("product_id, horizon_days, expected_units, confidence, computed_at")
        .order("computed_at", { ascending: false })
        .limit(10),
      s
        .from("inv_expiry_alerts")
        .select("batch_id, tier, qty_at_alert, expiry_date, created_at")
        .is("acknowledged_at", null)
        .order("expiry_date", { ascending: true })
        .limit(10),
      s.from("ai_events").select("*", { count: "exact", head: true }).eq("status", "pending"),
      s
        .from("agent_approval_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      s
        .from("ai_decisions")
        .select("*", { count: "exact", head: true })
        .gt("created_at", since24h),
    ]);

    const world = (worldRes.data ?? []) as unknown as WorldSystem[];
    const orch = world.find((w) => w.system_name === "orchestrator") ?? null;

    return {
      brain: {
        online: (orch?.status ?? "unknown") !== "offline",
        last_orchestrator_run: orch?.checked_at ?? null,
        orchestrator_status: orch?.status ?? null,
      },
      agents: (agentsRes.data ?? []) as unknown as AgentSummary[],
      world,
      events: (eventsRes.data ?? []) as unknown as EventRow[],
      decisions: (decisionsRes.data ?? []) as unknown as DecisionRow[],
      runs: (runsRes.data ?? []) as unknown as RunRow[],
      forecasts: (forecastsRes.data ?? []) as unknown as ForecastRow[],
      expiries: (expiriesRes.data ?? []) as unknown as ExpiryAlert[],
      counts: {
        pending_events: pendingEventsRes.count ?? 0,
        pending_approvals: pendingApprovalsRes.count ?? 0,
        decisions_last_24h: decisionsCountRes.count ?? 0,
      },
    };
  });
