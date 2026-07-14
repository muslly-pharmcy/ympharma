import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createDoctorSchema, submitVerificationSchema, verifyDoctorSchema, createSpecialtySchema,
  type CreateDoctorInput, type SubmitVerificationInput, type VerifyDoctorInput, type CreateSpecialtyInput,
} from "../domain/schemas";

export const createDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateDoctorInput) => createDoctorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hc_create_doctor", { _payload: data as never });
    if (error) throw new Error(error.message);
    return { doctor_id: id as string };
  });

export const submitDoctorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubmitVerificationInput) => submitVerificationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hc_submit_verification", {
      _doctor: data.doctor_id, _documents: data.documents as never,
    });
    if (error) throw new Error(error.message);
    return { request_id: id as string };
  });

export const verifyDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: VerifyDoctorInput) => verifyDoctorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("hc_verify_doctor", {
      _doctor: data.doctor_id, _decision: data.decision, _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateSpecialtyInput) => createSpecialtySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hc_create_specialty", {
      _code: data.code, _name_ar: data.name_ar, _name_en: data.name_en,
      _description_ar: data.description_ar ?? undefined, _description_en: data.description_en ?? undefined,
      _sort_order: data.sort_order,
    });
    if (error) throw new Error(error.message);
    return { specialty_id: id as string };
  });

export const listPublicDoctors = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("hc_doctors")
      .select("id, slug, full_name_ar, full_name_en, title, photo_url, years_experience, languages")
      .eq("is_public", true).eq("verification_status", "verified").limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
