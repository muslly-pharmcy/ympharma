import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: ReturnType<typeof Object>; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa: any = ctx.supabase;
  const { data } = await supa.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("FORBIDDEN");
}

export const universeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [permsRes, actionsRes, worldRes] = await Promise.all([
      supabaseAdmin
        .from("ai_agent_permissions")
        .select("agent_name, permission")
        .order("agent_name"),
      supabaseAdmin
        .from("ai_actions")
        .select("id, agent_name, tool_name, status, requires_approval, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("ai_world_health")
        .select("system_name, status, metrics, checked_at")
        .order("checked_at", { ascending: false })
        .limit(50),
    ]);

    // Roll world-health rows into latest-per-system.
    const latest = new Map<string, { system_name: string; status: string; metrics: unknown; checked_at: string }>();
    for (const r of worldRes.data ?? []) {
      if (!latest.has(r.system_name as string)) {
        latest.set(r.system_name as string, {
          system_name: r.system_name as string,
          status: r.status as string,
          metrics: r.metrics,
          checked_at: r.checked_at as string,
        });
      }
    }

    return {
      permissions: permsRes.data ?? [],
      actions: actionsRes.data ?? [],
      world: Array.from(latest.values()),
    };
  });
