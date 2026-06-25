// Server functions for the /admin-agent-runs dashboard.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("صلاحيات الأدمن مطلوبة");
}

const filterSchema = z.object({
  hours: z.number().int().min(1).max(720).default(24),
  agent: z.string().min(1).max(40).optional(),
  status: z.enum(["ok", "warn", "error"]).optional(),
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(2000).default(500),
});

export const getAgentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    let q = context.supabase
      .from("agent_runs")
      .select("id,agent,kind,status,started_at,finished_at,summary,details,findings_count,recommendations_count,execution_time_ms,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.agent) q = q.eq("agent", data.agent as any);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.or(`summary.ilike.%${data.q}%,kind.ilike.%${data.q}%`);
    const { data: runs, error } = await q;
    if (error) throw new Error(error.message);
    return { runs: runs ?? [], hours: data.hours };
  });

export const getAgentRunsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    let q = context.supabase
      .from("agent_runs")
      .select("id,agent,kind,status,started_at,finished_at,summary,findings_count,recommendations_count,execution_time_ms,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.agent) q = q.eq("agent", data.agent as any);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.or(`summary.ilike.%${data.q}%,kind.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const cols = ["id","agent","kind","status","started_at","finished_at","summary","findings_count","recommendations_count","execution_time_ms","created_at"];
    const esc = (v: unknown) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [cols.join(","), ...(rows ?? []).map((r: any) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return { csv, count: rows?.length ?? 0 };
  });

export const getAgentRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ hours: z.number().int().min(1).max(720).default(24) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    const { data: recs, error } = await context.supabase
      .from("agent_recommendations")
      .select("id,agent_name,category,title,rationale,impact_estimate,confidence,status,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { recommendations: recs ?? [] };
  });

export const getActiveAgentAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("get_agent_alerts");
    if (error) throw new Error(error.message);
    return { alerts: data ?? [] };
  });

export const getAgentList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const { data, error } = await context.supabase
      .from("agent_runs")
      .select("agent")
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const agents = Array.from(new Set((data ?? []).map((r: any) => r.agent))).sort();
    return { agents };
  });
