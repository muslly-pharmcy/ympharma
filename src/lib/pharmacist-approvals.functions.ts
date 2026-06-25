// Server functions for the pharmacist dashboard: approve/reject a queued
// prescription review. RLS already restricts agent_approval_requests to
// admin/owner; we additionally verify the caller's role inside the handler
// for defence-in-depth and clear 403 semantics.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ApproveInput = z.object({
  approvalId: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

const RejectInput = z.object({
  approvalId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

async function assertAdminOrOwner(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> },
  userId: string,
) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) {
    throw new Error("Forbidden: admin or owner role required");
  }
}

export const approvePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("agent_approval_requests")
      .update({
        status: "approved",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.approvalId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true, approvalId: data.approvalId };
  });

export const rejectPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("agent_approval_requests")
      .update({
        status: "rejected",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.reason,
      })
      .eq("id", data.approvalId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true, approvalId: data.approvalId };
  });
