// Server functions for the /admin-agent-runs dashboard.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const getAgentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ hours: z.union([z.literal(12), z.literal(24)]).default(24) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    const { data: runs, error } = await context.supabase
      .from("agent_runs")
      .select("id,agent,kind,status,started_at,finished_at,summary,details,findings_count,recommendations_count,execution_time_ms,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { runs: runs ?? [], hours: data.hours };
  });

export const getAgentRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ hours: z.union([z.literal(12), z.literal(24)]).default(24) }).parse(d))
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
