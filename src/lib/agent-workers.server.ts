// Shared worker runner for agent hook routes.
// Calls the matching `run_<agent>_worker()` RPC, writes an agent_runs row,
// and returns a JSON Response.

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

export async function runAgentHook(request: Request, agent: AgentName, kind: "scheduled" | "manual" = "scheduled"): Promise<Response> {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const started = Date.now();
  const startedAt = new Date().toISOString();

  // Open a running row
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

    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "ok",
        finished_at: new Date().toISOString(),
        summary,
        details: payload,
        findings_count: findings,
        recommendations_count: recs,
        execution_time_ms: Date.now() - started,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ ok: true, agent, run_id: runId, findings, recommendations: recs, summary, details: payload }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("agent_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        summary: msg,
        execution_time_ms: Date.now() - started,
      })
      .eq("id", runId);
    return new Response(JSON.stringify({ ok: false, agent, run_id: runId, error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
