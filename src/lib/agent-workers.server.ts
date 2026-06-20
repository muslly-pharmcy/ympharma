// Shared worker runner for agent hook routes.
// Writes BOTH an `agent_runs` row (observability for every hook tick) AND,
// when the RPC returns recommendations, one `agent_actions` row per agent run
// (centralized audit ledger consumed by /admin-automation-hub).

import { verifyCronSecret } from "@/lib/cron-auth.server";

export type AgentName = "ceo" | "cto" | "sales" | "inventory" | "operations" | "marketing" | "cx" | "bi";

const RPC_BY_AGENT: Record<AgentName, string> = {
  ceo: "run_ceo_worker",
  cto: "run_cto_worker",
  sales: "run_sales_worker",
  inventory: "run_inventory_worker",
  operations: "run_operations_worker",
  marketing: "run_marketing_worker",
  cx: "run_cx_worker",
  bi: "run_bi_worker",
};

// Default pipeline + priority per agent (used when the agent doesn't supply its own).
const DEFAULTS_BY_AGENT: Record<AgentName, { pipeline: string; priority: string }> = {
  ceo: { pipeline: "MARKETING_QUEUE", priority: "MEDIUM" },
  cto: { pipeline: "INVENTORY", priority: "MEDIUM" },
  sales: { pipeline: "ORDERS", priority: "HIGH" },
  inventory: { pipeline: "INVENTORY", priority: "HIGH" },
  operations: { pipeline: "ORDERS", priority: "MEDIUM" },
  marketing: { pipeline: "MARKETING_QUEUE", priority: "MEDIUM" },
  cx: { pipeline: "MARKETING_QUEUE", priority: "MEDIUM" },
  bi: { pipeline: "INVENTORY", priority: "LOW" },
};

export async function runAgentHook(request: Request, agent: AgentName, kind: "scheduled" | "manual" = "scheduled"): Promise<Response> {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const started = Date.now();
  const startedAt = new Date().toISOString();

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("agent_runs")
    .insert({ agent, kind, status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return new Response(JSON.stringify({ ok: false, error: runErr?.message ?? "insert failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const runId = runRow.id as string;

  try {
    const { data, error } = await supabaseAdmin.rpc(RPC_BY_AGENT[agent] as never);
    if (error) throw new Error(error.message);
    const payload = (data ?? {}) as Record<string, unknown>;
    const summary = (payload.summary as string) ?? `agent ${agent} completed`;
    const findings = Number(payload.findings_count ?? 0);
    const recs = Number(payload.recommendations_count ?? 0);
    const executionMs = Date.now() - started;

    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "ok",
        finished_at: new Date().toISOString(),
        summary,
        details: payload as never,
        findings_count: findings,
        recommendations_count: recs,
        execution_time_ms: executionMs,
      })
      .eq("id", runId);

    // Audit ledger: always write one agent_actions row per run.
    // When recs > 0, it's a real PENDING_APPROVAL recommendation.
    // When recs == 0, it's a NO_OP marker (M11) so the run is still visible
    // in /admin-automation-hub instead of vanishing.
    const defaults = DEFAULTS_BY_AGENT[agent];
    const isNoop = recs === 0;
    const actionType = isNoop
      ? `${agent.toUpperCase()}_NO_OP`
      : ((payload.action_type as string) ?? `${agent.toUpperCase()}_RECOMMENDATION`);
    const arabic = isNoop
      ? `لا توصيات من وكيل ${agent} في هذا التشغيل (findings=${findings})`
      : ((payload.compiled_arabic_output as string) ?? summary);
    const { error: actErr } = await supabaseAdmin
      .from("agent_actions")
      .insert({
        agent_name: agent,
        originating_agent: agent as never,
        target_pipeline: ((payload.target_pipeline as string) ?? defaults.pipeline) as never,
        priority_level: isNoop ? "LOW" : ((payload.priority_level as string) ?? defaults.priority),
        action_type: actionType,
        payload: { run_id: runId, findings, recommendations: recs, source: "hook", details: payload } as never,
        status: isNoop ? "noop" : "pending",
        execution_status: (isNoop ? "NO_OP" : "PENDING_APPROVAL") as never,
        compiled_arabic_output: arabic,
      } as never);
    if (actErr) {
      // Don't fail the whole hook — observability failure is non-fatal.
      await supabaseAdmin.from("error_logs").insert({
        source: `agent-actions-insert/${agent}`,
        message: actErr.message,
        metadata: { run_id: runId } as never,
      } as never).then(() => null, () => null);
    }

    return new Response(
      JSON.stringify({ ok: true, agent, run_id: runId, findings, recommendations: recs, summary, details: payload }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const executionMs = Date.now() - started;
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        summary: msg,
        execution_time_ms: executionMs,
      })
      .eq("id", runId);
    // Audit ledger: record the failed run as a FAILED action so admins see it.
    const defaults = DEFAULTS_BY_AGENT[agent];
    await supabaseAdmin.from("agent_actions").insert({
      agent_name: agent,
      originating_agent: agent as never,
      target_pipeline: defaults.pipeline as never,
      priority_level: "HIGH",
      action_type: `${agent.toUpperCase()}_FAILURE`,
      payload: { run_id: runId, source: "hook" } as never,
      status: "failed",
      execution_status: "FAILED" as never,
      compiled_arabic_output: `فشل تشغيل وكيل ${agent}: ${msg}`,
      error_message: msg,
    } as never).then(() => null, () => null);
    return new Response(JSON.stringify({ ok: false, agent, run_id: runId, error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

