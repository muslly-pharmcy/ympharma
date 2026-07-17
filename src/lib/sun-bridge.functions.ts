import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only stats for the Phoenix ↔ Sun bridge and worker.
 * Reads via the caller's authenticated Supabase client so admin RLS applies.
 */
export const sunBridgeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;

    const [
      { count: bridgeLag },
      { count: sunPending },
      { count: sunFailed },
      { data: lastDecision },
      { data: recentDecisions },
    ] = await Promise.all([
      sb.from("agent_events").select("id", { count: "exact", head: true }).is("processed_at", null),
      sb.from("ai_events").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("ai_events").select("id", { count: "exact", head: true }).eq("status", "failed"),
      sb
        .from("ai_decisions")
        .select("created_at, agent_name")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("ai_decisions")
        .select("agent_name, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
        .limit(1000),
    ]);

    const perAgent24h: Record<string, number> = {};
    for (const d of recentDecisions ?? []) {
      const k = (d.agent_name as string) ?? "unknown";
      perAgent24h[k] = (perAgent24h[k] ?? 0) + 1;
    }

    return {
      bridgeLag: bridgeLag ?? 0,
      sunPending: sunPending ?? 0,
      sunFailed: sunFailed ?? 0,
      lastDecisionAt: lastDecision?.created_at ?? null,
      lastDecisionAgent: lastDecision?.agent_name ?? null,
      perAgent24h,
    };
  });
