// Automation Hub server fns — list / approve / skip / retry agent_actions.
// All gated behind owner/admin roles via requireSupabaseAuth + has_role check.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListInput = z.object({
  execution_status: z.enum(["PENDING_APPROVAL", "EXECUTED", "SKIPPED", "FAILED", "ALL"]).default("PENDING_APPROVAL"),
  target_pipeline: z.enum(["PRESCRIPTIONS", "ORDERS", "MARKETING_QUEUE", "INVENTORY", "ALL"]).default("ALL"),
  originating_agent: z.string().max(64).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

export const listAgentActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("agent_actions")
      .select("id, agent_name, originating_agent, action_type, target_pipeline, execution_status, status, priority_level, compiled_arabic_output, error_message, payload, created_at, executed_at, updated_by_admin")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.execution_status !== "ALL") q = q.eq("execution_status", data.execution_status);
    if (data.target_pipeline !== "ALL") q = q.eq("target_pipeline", data.target_pipeline);
    if (data.originating_agent) q = q.eq("originating_agent", data.originating_agent as never);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: rows ?? [] };
  });

const MutateInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(["EXECUTE", "SKIP", "RETRY"]),
  note: z.string().max(500).optional(),
});

export const decideAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MutateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const adminTag = (context.claims?.email as string | undefined) ?? context.userId;
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = { updated_by_admin: adminTag, updated_at: now };
    if (data.decision === "EXECUTE") {
      patch.execution_status = "EXECUTED";
      patch.status = "executed";
      patch.executed_at = now;
      patch.approved_at = now;
      patch.approved_by = context.userId;
    } else if (data.decision === "SKIP") {
      patch.execution_status = "SKIPPED";
      patch.status = "cancelled";
    } else {
      patch.execution_status = "PENDING_APPROVAL";
      patch.status = "pending";
      patch.error_message = null;
    }
    if (data.note) patch.error_message = data.note;

    const { error } = await context.supabase.from("agent_actions").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const agentActionsStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("agent_actions")
      .select("execution_status")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (error) throw new Error(error.message);
    const counts = { PENDING_APPROVAL: 0, EXECUTED: 0, SKIPPED: 0, FAILED: 0 } as Record<string, number>;
    for (const r of data ?? []) {
      const k = (r as { execution_status?: string }).execution_status ?? "PENDING_APPROVAL";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return { ok: true as const, counts };
  });
