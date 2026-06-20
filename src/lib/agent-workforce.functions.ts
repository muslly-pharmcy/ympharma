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

async function assertAdmin(ctx: { supabase: { rpc: (n: string, args?: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

export const getAgentWorkforce = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await (context.supabase as never as { rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc("agent_workforce_summary");
    if (error) throw new Error(error.message);
    return data as {
      agents: Array<{
        name: string;
        last_run: { started_at?: string; status?: string; summary?: string; findings_count?: number; recommendations_count?: number; execution_time_ms?: number } | null;
        kpis: Array<{ metric: string; score: number | null; details: Record<string, unknown> }> | null;
        avg_kpi: number | null;
        open_recommendations: number;
      }>;
      readiness_score: number | null;
      as_of: string;
    };
  });

export const runOneAgentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ agent: z.enum(AGENTS) }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
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
      const { data: res, error } = await supabaseAdmin.rpc(RPC_BY_AGENT[data.agent] as never);
      if (error) throw new Error(error.message);
      const payload = (res ?? {}) as Record<string, unknown>;
      await supabaseAdmin.from("agent_runs").update({
        status: "ok",
        finished_at: new Date().toISOString(),
        summary: (payload.summary as string) ?? "",
        details: payload as never,
        findings_count: Number(payload.findings_count ?? 0),
        recommendations_count: Number(payload.recommendations_count ?? 0),
        execution_time_ms: Date.now() - started,
      }).eq("id", row.id);
      return { ok: true, agent: data.agent, result: payload };
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
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await (context.supabase as never as { rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc("run_all_agents_now");
    if (error) throw new Error(error.message);
    return data;
  });

export const listAgentRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ agent: z.enum(AGENTS).optional(), limit: z.number().int().min(1).max(200).optional() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const sb = context.supabase as never as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[]; error: { message: string } | null }> } };
          order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[]; error: { message: string } | null }> };
        };
      };
    };
    const q = sb.from("agent_recommendations").select("id,agent_name,category,title,rationale,payload,impact_estimate,confidence,status,created_at");
    const limit = data.limit ?? 50;
    const { data: rows, error } = data.agent
      ? await q.eq("agent_name", data.agent).order("created_at", { ascending: false }).limit(limit)
      : await q.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return rows;
  });
