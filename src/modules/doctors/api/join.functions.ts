// Doctor join intake + admin review.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { joinSubmissionSchema, reviewJoinSchema, type JoinSubmissionInput, type ReviewJoinInput } from "../domain/practice-schemas";
import { normalizeAr } from "../domain/arabicNormalize";
import { normalizePhoneYE } from "@/lib/normalize/phone";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

export const submitDoctorJoinV2 = createServerFn({ method: "POST" })
  .inputValidator((d: JoinSubmissionInput) => joinSubmissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalized_name_ar = normalizeAr(data.full_name_ar);
    const phone_e164 = normalizePhoneYE(data.phone) ?? data.phone;

    // Duplicate detection (server-side, uses the SECURITY DEFINER RPC)
    const { data: dupes } = await supabaseAdmin.rpc("hc_detect_doctor_duplicates", {
      _name_ar: data.full_name_ar,
      _phone: phone_e164,
    });
    const bestDup = Array.isArray(dupes) && dupes.length > 0 ? dupes[0] as { doctor_id: string; score: number } : null;

    const { data: ins, error } = await supabaseAdmin
      .from("hc_doctor_join_submissions")
      .insert({
        full_name_ar: data.full_name_ar,
        full_name_en: data.full_name_en ?? null,
        normalized_name_ar,
        title: data.title ?? null,
        phone: data.phone,
        phone_e164,
        email: data.email || null,
        city: data.city ?? null,
        governorate: data.governorate ?? null,
        claimed_specialties: data.claimed_specialties,
        practice_wishlist: data.practice_wishlist,
        documents: data.documents,
        biography: data.biography ?? null,
        duplicate_of: bestDup?.doctor_id ?? null,
        duplicate_score: bestDup?.score ?? 0,
        status: (bestDup && bestDup.score >= 80) ? "duplicate" : "new",
      } as never)
      .select("id, status, duplicate_score")
      .single();

    if (error) throw new Error(error.message);
    return ins;
  });

export const listJoinSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["new", "reviewing", "approved", "rejected", "duplicate", "all"]).default("new"),
    limit: z.number().int().min(1).max(200).default(50),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("hc_doctor_join_submissions")
      .select("id, full_name_ar, full_name_en, title, phone_e164, email, city, governorate, claimed_specialties, duplicate_of, duplicate_score, status, reviewer_notes, decision_at, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const reviewJoinSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReviewJoinInput) => reviewJoinSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.decision === "approve") {
      const { data: newDoctorId, error } = await context.supabase.rpc("hc_approve_join_submission", {
        _submission: data.submission_id,
      });
      if (error) throw new Error(error.message);
      if (data.reviewer_notes) {
        await context.supabase
          .from("hc_doctor_join_submissions")
          .update({ reviewer_notes: data.reviewer_notes })
          .eq("id", data.submission_id);
      }
      return { ok: true, doctor_id: newDoctorId as string };
    }
    const patch: Record<string, unknown> = {
      status: data.decision === "reject" ? "rejected" : data.decision === "duplicate" ? "duplicate" : "reviewing",
      reviewer_id: context.userId,
      reviewer_notes: data.reviewer_notes ?? null,
      decision_at: data.decision === "reviewing" ? null : new Date().toISOString(),
    };
    if (data.duplicate_of) patch.duplicate_of = data.duplicate_of;
    const { error } = await context.supabase
      .from("hc_doctor_join_submissions")
      .update(patch as never)
      .eq("id", data.submission_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
