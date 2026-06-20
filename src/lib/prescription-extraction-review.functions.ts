// Phase 7 — Reviewer edits/approval on prescription_extractions
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MedSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(200).optional().nullable(),
  duration: z.string().trim().max(200).optional().nullable(),
});

const EditsSchema = z.object({
  medications: z.array(MedSchema).max(50).optional(),
  doctor_name: z.string().trim().max(200).optional().nullable(),
  prescription_date: z.string().trim().max(40).optional().nullable(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  allergies: z.array(z.string().trim().max(200)).max(50).optional(),
  interactions: z.array(z.string().trim().max(400)).max(50).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const rxId = z.string().trim().min(3).max(64);

async function ensureStaff(supabase: any, userId: string) {
  const [{ data: a }, { data: o }, { data: p }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
    supabase.rpc("has_permission", { _user_id: userId, _permission: "prescriptions" }),
  ]);
  if (!a && !o && !p) throw new Error("forbidden");
}

export const getExtractionForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prescriptionId: rxId }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("prescription_extractions")
      .select(
        "id, prescription_id, prescription_file_id, source_type, status, model_tier, model_used, confidence, attempts, medications, doctor_name, prescription_date, diagnosis, allergies, interactions, reviewer_edits, reviewer_approved_at, reviewer_approved_by, error, created_at, updated_at",
      )
      .eq("prescription_id", data.prescriptionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { extraction: row ?? null };
  });

export const saveExtractionEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ extractionId: z.string().uuid(), edits: EditsSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureStaff(context.supabase, context.userId);
    const patch = {
      reviewer_edits: {
        ...data.edits,
        edited_by: context.userId,
        edited_at: new Date().toISOString(),
      },
    };
    const { data: row, error } = await context.supabase
      .from("prescription_extractions")
      .update(patch as never)
      .eq("id", data.extractionId)
      .select("id, prescription_id, reviewer_edits")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found_or_forbidden");

    await context.supabase.from("activity_logs").insert({
      action: "prescription_extraction.edited",
      entity_type: "prescription_extraction",
      entity_id: data.extractionId,
      details: { by: context.userId } as never,
    });

    return { ok: true, extraction: row };
  });

export const approveExtractionEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ extractionId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("prescription_extractions")
      .update({
        status: "done",
        reviewer_approved_at: new Date().toISOString(),
        reviewer_approved_by: context.userId,
      } as never)
      .eq("id", data.extractionId)
      .select("id, prescription_id, status, reviewer_approved_at, reviewer_approved_by")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found_or_forbidden");

    await context.supabase.from("activity_logs").insert({
      action: "prescription_extraction.approved",
      entity_type: "prescription_extraction",
      entity_id: data.extractionId,
      details: { by: context.userId } as never,
    });

    return { ok: true, extraction: row };
  });
