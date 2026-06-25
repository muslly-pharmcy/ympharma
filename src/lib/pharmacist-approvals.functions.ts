// src/lib/pharmacist-approvals.functions.ts
// ============================================================
// PHARMACIST APPROVAL FUNCTIONS — Role-Based Prescription Approval
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdminOrOwner(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const { data: isOwner } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "owner",
  });
  if (!isAdmin && !isOwner) {
    throw new Error("Forbidden: Admin or Owner role required");
  }
  return true;
}

const ApproveSchema = z.object({
  approvalId: z.string().uuid(),
});

export const approvePrescription = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveSchema.parse(input))
  .handler(async ({ context, input }: any) => {
    const { approvalId } = input;
    const { supabase, userId } = context;

    await assertAdminOrOwner(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("agent_approval_requests")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      } as any)
      .eq("id", approvalId)
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        throw new Error("Request not found or already processed");
      }
      throw new Error(`فشل التحديث: ${updateError.message}`);
    }

    if (!updated) {
      throw new Error("Request already processed or not in pending state");
    }

    return { success: true, approval: updated };
  });

const RejectSchema = z.object({
  approvalId: z.string().uuid(),
  reason: z.string().optional(),
});

export const rejectPrescription = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectSchema.parse(input))
  .handler(async ({ context, input }: any) => {
    const { approvalId, reason } = input;
    const { supabase, userId } = context;

    await assertAdminOrOwner(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("agent_approval_requests")
      .update({
        status: "rejected",
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || "رفض من قبل الصيدلي",
      } as any)
      .eq("id", approvalId)
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        throw new Error("Request not found or already processed");
      }
      throw new Error(`فشل التحديث: ${updateError.message}`);
    }

    if (!updated) {
      throw new Error("Request already processed or not in pending state");
    }

    return { success: true, approval: updated };
  });
