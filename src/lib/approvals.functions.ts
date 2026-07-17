import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ApprovalListItem } from "@/ai/core/approval-types";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) {
    const { data: ownerFlag, error: ownerErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "owner",
    });
    if (ownerErr) throw ownerErr;
    if (!ownerFlag) throw new Error("Forbidden: admin or owner role required");
  }
}

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApprovalListItem[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("agent_approval_requests")
      .select(
        "id, agent_id, action_type, customer_message, ai_confidence, ai_risk_score, payload, status, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as unknown as ApprovalListItem[];
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(1000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: updated, error } = await context.supabase
      .from("agent_approval_requests")
      .update({
        status: data.decision,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("id, status, agent_id, action_type")
      .single();
    if (error) throw error;

    // Audit stamp — best effort.
    try {
      await context.supabase.from("ai_security_audit").insert({
        actor: "admin",
        actor_id: context.userId,
        action: `approval:${data.decision}`,
        resource: `approval:${data.id}`,
        result: data.decision,
        metadata: { note: data.note ?? null, agent_id: updated.agent_id, action_type: updated.action_type } as never,
      });
    } catch (err) {
      console.warn("[approvals] audit insert failed:", (err as Error).message);
    }

    return updated;
  });
