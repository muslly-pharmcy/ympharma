/**
 * Admin-only server functions for browsing AI experience memory.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListSchema = z.object({
  agent: z.string().min(1).max(120).optional(),
  limit: z.number().int().min(1).max(200).default(30),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("Forbidden: admin role required");
}

export const listAgentMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("ai_memory")
      .select("id, agent_name, memory_type, context, importance, created_at, expires_at")
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.agent) q = q.eq("agent_name", data.agent);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMemoryAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("ai_memory")
      .select("agent_name")
      .limit(1000);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      counts.set(r.agent_name, (counts.get(r.agent_name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([agent_name, count]) => ({ agent_name, count }))
      .sort((a, b) => b.count - a.count);
  });
