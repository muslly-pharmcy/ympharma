// Phase 3 — Admin-only server function wrapping prescription-intelligence.server,
// plus user-facing submit/status server fns for the upload page.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never),
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "owner" } as never),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

/** Admin-only direct analysis from an absolute URL (legacy). */
export const analyzePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ imageUrl: z.string().url() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase as never, context.userId);
    const { analyzePrescriptionImage } = await import(
      "@/lib/prescription-intelligence.server"
    );
    return analyzePrescriptionImage(data.imageUrl);
  });

/**
 * User-facing: takes a storage path in the `prescriptions` bucket, signs it,
 * runs AI analysis, creates an `agent_approval_requests` row + notifies admins.
 * Returns the new request id so the client can poll status.
 */
export const submitPrescriptionForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        storagePath: z.string().min(3).max(500),
        customerNote: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Sign URL (10 min) so the AI gateway can fetch it
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from("prescriptions")
      .createSignedUrl(data.storagePath, 600);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message ?? "signed_url_failed");
    }

    // 2) Analyze
    const { analyzePrescriptionImage } = await import(
      "@/lib/prescription-intelligence.server"
    );
    const analysis = await analyzePrescriptionImage(signed.signedUrl);

    // 3) Create approval request
    const correlationId = crypto.randomUUID();
    const summary =
      analysis.medicines.length > 0
        ? `${analysis.medicines.length} دواء — ناقص: ${analysis.missingMedicines.length}`
        : "وصفة بحاجة لمراجعة يدوية";

    const { data: created, error: insErr } = await supabaseAdmin
      .from("agent_approval_requests")
      .insert({
        agent_id: "user_upload",
        correlation_id: correlationId,
        user_phone: null,
        action_type: "approve_prescription",
        payload: {
          storagePath: data.storagePath,
          submittedBy: context.userId,
          customerNote: data.customerNote ?? null,
          analysis,
        } as never,
        customer_message: data.customerNote ?? summary,
        status: "pending",
      } as never)
      .select("id")
      .single();
    if (insErr || !created) throw new Error(insErr?.message ?? "insert_failed");

    // 4) Notify all admins/owners (best-effort)
    try {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "owner"] as never);
      const ids = Array.from(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
      if (ids.length > 0) {
        await supabaseAdmin.from("notifications").insert(
          ids.map((uid) => ({
            user_id: uid,
            type: "prescription_review",
            title: "وصفة جديدة بحاجة لمراجعة",
            body: summary,
            priority: analysis.missingMedicines.length > 0 ? "high" : "medium",
            metadata: { approvalId: created.id, correlationId } as never,
          })) as never,
        );
      }
    } catch (err) {
      console.error("[prescription] notify admins failed", err);
    }

    return {
      approvalId: (created as { id: string }).id,
      analysis,
    };
  });

/** Owner of the submission can poll status of their own prescription request. */
export const getMyPrescriptionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("agent_approval_requests")
      .select("id, status, action_type, decision_note, decided_at, created_at, payload")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { request: null };
    const payload = (row as { payload: { submittedBy?: string } }).payload ?? {};
    if (payload.submittedBy !== context.userId) {
      // Don't leak other users' requests
      return { request: null };
    }
    return { request: row };
  });
