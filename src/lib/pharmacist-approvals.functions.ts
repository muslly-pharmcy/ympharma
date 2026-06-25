// src/lib/pharmacist-approvals.functions.ts
// Server fns: uses real columns decided_by/decided_at/decision_note; uses context.supabase (RLS).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdminOrOwner(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("Forbidden: Admin or Owner role required");
}

const ApproveSchema = z.object({
  approvalId: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

export const approvePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrOwner(context.supabase, context.userId);
    const { data: updated, error } = await context.supabase
      .from("agent_approval_requests")
      .update({
        status: "approved",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.approvalId)
      .eq("status", "pending")
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") throw new Error("Request not found or already processed");
      throw new Error(error.message);
    }
    return { success: true, approval: updated };
  });

const RejectSchema = z.object({
  approvalId: z.string().uuid(),
  reason: z.string().optional(),
});

export const rejectPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrOwner(context.supabase, context.userId);
    const { data: updated, error } = await context.supabase
      .from("agent_approval_requests")
      .update({
        status: "rejected",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        decision_note: data.reason ?? "رفض من قبل الصيدلي",
      })
      .eq("id", data.approvalId)
      .eq("status", "pending")
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") throw new Error("Request not found or already processed");
      throw new Error(error.message);
    }
    return { success: true, approval: updated };
  });
