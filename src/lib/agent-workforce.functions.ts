import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AGENTS = ["ceo", "cto", "sales", "inventory", "operations", "marketing", "cx", "bi"] as const;
type AgentName = (typeof AGENTS)[number];

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

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export type AgentKpi = { metric: string; score: number | null; details: Json };
export type AgentLastRun = {
  started_at?: string;
  finished_at?: string | null;
  status?: string;
  summary?: string | null;
  findings_count?: number | null;
  recommendations_count?: number | null;
  execution_time_ms?: number | null;
} | null;
export type WorkforceAgent = {
  name: string;
  last_run: AgentLastRun;
  kpis: AgentKpi[] | null;
  avg_kpi: number | null;
  open_recommendations: number;
};
export type WorkforceSummary = {
  agents: WorkforceAgent[];
  readiness_score: number | null;
  as_of: string;
};
export type AgentRecommendation = {
  id: string;
  agent_name: string;
  category: string;
  title: string;
  rationale: string | null;
  payload: Json;
  impact_estimate: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(ctx: any) {
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

export const getAgentWorkforce = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkforceSummary> => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc("agent_workforce_summary");
    if (error) throw new Error(error.message);
    return JSON.parse(JSON.stringify(data)) as WorkforceSummary;
  });

export const runOneAgentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ agent: z.enum(AGENTS) }).parse(i))
  .handler(async ({ context, data }): Promise<{ ok: true; agent: string; result: Json }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();
    const startedAt = new Date().toISOString();
    const { data: row, error: insErr } = await supabaseAdmin
      .from("agent_runs")
      .insert({ agent: data.agent, kind: "manual", status: "running", started_at: startedAt })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "insert failed");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: res, error } = await (supabaseAdmin as any).rpc(RPC_BY_AGENT[data.agent]);
      if (error) throw new Error(error.message);
      const payload = (res ?? {}) as Record<string, unknown>;
      await supabaseAdmin.from("agent_runs").update({
        status: "ok",
        finished_at: new Date().toISOString(),
        summary: (payload.summary as string) ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: payload as any,
        findings_count: Number(payload.findings_count ?? 0),
        recommendations_count: Number(payload.recommendations_count ?? 0),
        execution_time_ms: Date.now() - started,
      }).eq("id", row.id);
      return { ok: true, agent: data.agent, result: JSON.parse(JSON.stringify(payload)) as Json };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("agent_runs").update({
        status: "error", finished_at: new Date().toISOString(), summary: msg,
        execution_time_ms: Date.now() - started,
      }).eq("id", row.id);
      throw new Error(msg);
    }
  });

export const runAllAgentsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Json> => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc("run_all_agents_now");
    if (error) throw new Error(error.message);
    return JSON.parse(JSON.stringify(data)) as Json;
  });

export const listAgentRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ agent: z.enum(AGENTS).optional(), limit: z.number().int().min(1).max(200).optional() }).parse(i))
  .handler(async ({ context, data }): Promise<AgentRecommendation[]> => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const base = sb.from("agent_recommendations")
      .select("id,agent_name,category,title,rationale,payload,impact_estimate,confidence,status,created_at");
    const limit = data.limit ?? 50;
    const query = data.agent ? base.eq("agent_name", data.agent) : base;
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return JSON.parse(JSON.stringify(rows ?? [])) as AgentRecommendation[];
  });
