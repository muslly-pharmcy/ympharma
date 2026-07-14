import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createDoctorSchema, submitVerificationSchema, verifyDoctorSchema, createSpecialtySchema,
  type CreateDoctorInput, type SubmitVerificationInput, type VerifyDoctorInput, type CreateSpecialtyInput,
} from "../domain/schemas";
import { matchesAr, normalizeAr } from "../domain/arabicNormalize";

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

// ---------- P6.5-A public directory ----------

export type PublicDoctorRow = {
  id: string;
  slug: string;
  full_name_ar: string;
  full_name_en: string | null;
  title: string | null;
  photo_url: string | null;
  years_experience: number | null;
  languages: string[];
  verification_status: string;
  metadata: Record<string, unknown>;
  specialties: Array<{ id: string; code: string; name_ar: string; name_en: string; is_primary: boolean }>;
  locations: Array<{ id: string; name_ar: string; city: string | null; governorate: string | null; kind: string; phone: string | null; whatsapp: string | null }>;
};

const searchInput = z.object({
  q: z.string().optional().default(""),
  specialty: z.string().optional().default(""),
  city: z.string().optional().default(""),
  facility: z.string().optional().default(""),
  page: z.number().int().optional().default(1),
});

export const searchDoctorsPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => searchInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: rows, error } = await supabase
      .from("hc_doctors")
      .select(`
        id, slug, full_name_ar, full_name_en, title, photo_url, years_experience, languages,
        verification_status, metadata,
        specialties:hc_doctor_specialties ( is_primary, specialty:hc_specialties ( id, code, name_ar, name_en ) ),
        locations:hc_doctor_locations ( location:hc_locations ( id, name_ar, city, governorate, kind, phone, whatsapp ) )
      `)
      .eq("is_public", true)
      .in("verification_status", ["verified", "pending"])
      .limit(500);
    if (error) throw new Error(error.message);

    const shaped: PublicDoctorRow[] = (rows ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, full_name_ar: r.full_name_ar, full_name_en: r.full_name_en,
      title: r.title, photo_url: r.photo_url, years_experience: r.years_experience,
      languages: r.languages ?? [], verification_status: r.verification_status,
      metadata: r.metadata ?? {},
      specialties: (r.specialties ?? []).filter((s: any) => s.specialty).map((s: any) => ({
        id: s.specialty.id, code: s.specialty.code, name_ar: s.specialty.name_ar,
        name_en: s.specialty.name_en, is_primary: !!s.is_primary,
      })),
      locations: (r.locations ?? []).filter((l: any) => l.location).map((l: any) => ({
        id: l.location.id, name_ar: l.location.name_ar, city: l.location.city,
        governorate: l.location.governorate, kind: l.location.kind,
        phone: l.location.phone, whatsapp: l.location.whatsapp,
      })),
    }));

    const filtered = shaped.filter((d) => {
      if (data.q && !(matchesAr(d.full_name_ar, data.q) || matchesAr(d.title, data.q) || d.specialties.some((s) => matchesAr(s.name_ar, data.q)))) return false;
      if (data.specialty && !d.specialties.some((s) => s.code === data.specialty || normalizeAr(s.name_ar) === normalizeAr(data.specialty))) return false;
      if (data.city && !d.locations.some((l) => matchesAr(l.city, data.city) || matchesAr(l.governorate, data.city))) return false;
      if (data.facility && !d.locations.some((l) => matchesAr(l.name_ar, data.facility))) return false;
      return true;
    });

    const perPage = 24;
    const start = Math.max(0, (data.page - 1) * perPage);
    return { total: filtered.length, page: data.page, perPage, doctors: filtered.slice(start, start + perPage) };
  });

export const getDoctorBySlugPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: row, error } = await supabase
      .from("hc_doctors")
      .select(`
        id, slug, full_name_ar, full_name_en, title, bio_ar, bio_en, photo_url, years_experience,
        languages, gender, verification_status, metadata,
        specialties:hc_doctor_specialties ( is_primary, specialty:hc_specialties ( id, code, name_ar, name_en ) ),
        locations:hc_doctor_locations ( role, location:hc_locations ( id, name_ar, address, city, governorate, kind, phone, whatsapp, lat, lng ) ),
        availability:hc_doctor_availability ( id, location_id, weekday, start_time, end_time, is_active ),
        qualifications:hc_doctor_qualifications ( id, title, institution, year, country )
      `)
      .eq("slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const listPublicFacets = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const [{ data: specs }, { data: locs }] = await Promise.all([
    supabase.from("hc_specialties").select("id, code, name_ar, name_en, sort_order").eq("status", "active").order("sort_order"),
    supabase.from("hc_locations").select("city, governorate, name_ar").eq("is_active", true).limit(500),
  ]);
  const cities = [...new Set((locs ?? []).map((l) => l.city).filter(Boolean))] as string[];
  const facilities = [...new Set((locs ?? []).map((l) => l.name_ar).filter(Boolean))] as string[];
  return { specialties: specs ?? [], cities: cities.sort(), facilities: facilities.sort() };
});
