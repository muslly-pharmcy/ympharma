// Doctor practices CRUD + profile updates. Additive to Phoenix P6.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  upsertPracticeSchema,
  updateDoctorProfileSchema,
  type UpsertPracticeInput,
  type UpdateDoctorProfileInput,
} from "../domain/practice-schemas";

async function assertDoctorOwnerOrAdmin(supabase: any, userId: string, doctorId: string) {
  const { data, error } = await supabase
    .from("hc_doctors")
    .select("id, user_id")
    .eq("id", doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("doctor_not_found");
  if (data.user_id === userId) return;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("forbidden");
}

export const listDoctorPractices = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ doctor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: rows, error } = await supabase
      .from("hc_doctor_practices")
      .select(`id, doctor_id, location_id, practice_type, working_hours, phone, whatsapp,
               assistant_phone, booking_method, consultation_duration_min, gallery,
               is_primary, is_active, notes,
               location:hc_locations ( id, name_ar, city, governorate, kind, address, lat, lng )`)
      .eq("doctor_id", data.doctor_id)
      .order("is_primary", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDoctorPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpsertPracticeInput) => upsertPracticeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorOwnerOrAdmin(context.supabase, context.userId, data.doctor_id);
    const payload = {
      doctor_id: data.doctor_id,
      location_id: data.location_id,
      practice_type: data.practice_type,
      working_hours: data.working_hours,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      assistant_phone: data.assistant_phone ?? null,
      booking_method: data.booking_method,
      consultation_duration_min: data.consultation_duration_min ?? null,
      gallery: data.gallery,
      is_primary: data.is_primary,
      is_active: data.is_active,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("hc_doctor_practices")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("hc_doctor_practices")
      .upsert(payload, { onConflict: "doctor_id,location_id" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

export const deleteDoctorPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), doctor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorOwnerOrAdmin(context.supabase, context.userId, data.doctor_id);
    const { error } = await context.supabase.from("hc_doctor_practices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateDoctorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateDoctorProfileInput) => updateDoctorProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorOwnerOrAdmin(context.supabase, context.userId, data.doctor_id);
    // Strip undefined so patch is minimal
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("hc_doctors")
      .update(patch)
      .eq("id", data.doctor_id);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("hc_normalize_doctor_row", { _doctor: data.doctor_id });
    return { ok: true };
  });

export const getDoctorDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ doctor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorOwnerOrAdmin(context.supabase, context.userId, data.doctor_id);
    const [{ data: doctor }, { count: apptCount }, { count: upcomingCount }, { count: practiceCount }] = await Promise.all([
      context.supabase
        .from("hc_doctors")
        .select("id, full_name_ar, profile_completeness, trust_score, verification_status, photo_url, slug")
        .eq("id", data.doctor_id)
        .maybeSingle(),
      context.supabase
        .from("hc_appointments")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", data.doctor_id),
      context.supabase
        .from("hc_appointments")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", data.doctor_id)
        .gte("scheduled_at", new Date().toISOString())
        .in("status", ["requested", "confirmed"]),
      context.supabase
        .from("hc_doctor_practices")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", data.doctor_id)
        .eq("is_active", true),
    ]);
    return {
      doctor,
      appointments_total: apptCount ?? 0,
      appointments_upcoming: upcomingCount ?? 0,
      practices_active: practiceCount ?? 0,
    };
  });
