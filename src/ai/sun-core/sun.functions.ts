// ☀️ Sun Core server functions — read APIs for the admin dashboard.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ListInput = z.object({ limit: z.number().int().min(1).max(200).default(50) });

export const sunListDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("sun_decisions")
      .select(
        "id,event_id,event_name,agent_dispatched,decision,confidence,reasoning,outcome,latency_ms,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const sunListAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("ai_agents")
      .select(
        "code,name,category,capabilities,event_subscriptions,enabled,health,last_dispatched_at",
      )
      .order("code");
    if (error) throw error;
    return rows ?? [];
  });

export const sunStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await context.supabase
      .from("sun_decisions")
      .select("latency_ms,agent_dispatched")
      .gte("created_at", sinceIso);
    const rows = (recent ?? []) as Array<{
      latency_ms: number | null;
      agent_dispatched: string | null;
    }>;

    const total = rows.length;
    const avgLatency =
      total > 0
        ? Math.round(rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / total)
        : 0;
    const perAgent: Record<string, number> = {};
    for (const r of rows) {
      const k = r.agent_dispatched ?? "sun_core";
      perAgent[k] = (perAgent[k] ?? 0) + 1;
    }
    return { lastHour: total, avgLatencyMs: avgLatency, perAgent };
  });
