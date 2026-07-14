// Phoenix Slice 1 — doctor profile completion server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ServiceItem = z.object({
  name_ar: z.string().min(1).max(120),
  name_en: z.string().max(120).optional().nullable(),
  fee_yer: z.number().int().nonnegative().optional().nullable(),
  duration_min: z.number().int().positive().max(600).optional().nullable(),
});

const AwardItem = z.object({
  title: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  issuer: z.string().max(200).optional().nullable(),
});

const ProfileExtrasSchema = z.object({
  doctor_id: z.string().uuid(),
  academic_title: z.string().max(120).optional().nullable(),
  medical_title: z.string().max(120).optional().nullable(),
  sub_specialties: z.array(z.string().min(1).max(120)).max(20).optional(),
  awards: z.array(AwardItem).max(50).optional(),
  services: z.array(ServiceItem).max(50).optional(),
  accepted_insurance: z.array(z.string().uuid()).max(50).optional(),
  consultation_fee_min: z.number().int().nonnegative().optional().nullable(),
  consultation_fee_max: z.number().int().nonnegative().optional().nullable(),
  intro_video_url: z.string().url().max(500).optional().nullable(),
  bio_ar: z.string().max(4000).optional().nullable(),
  bio_en: z.string().max(4000).optional().nullable(),
  languages: z.array(z.string().min(2).max(8)).max(10).optional(),
  emergency_available: z.boolean().optional(),
  telemedicine_ready: z.boolean().optional(),
  seo_title_ar: z.string().max(160).optional().nullable(),
  seo_desc_ar: z.string().max(320).optional().nullable(),
});

async function assertDoctorAccess(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  doctorId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("hc_doctors")
    .select("id, user_id")
    .eq("id", doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("doctor not found");
  if (data.user_id !== userId) {
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
  }
}

// Helper type — supabase client from middleware context.
type AuthedSupabase = Parameters<Parameters<typeof requireSupabaseAuth.server.handler>[0]>[0]["context"]["supabase"];
async function getAuthedSupabase(): Promise<AuthedSupabase> {
  throw new Error("type-only");
}

export const updateDoctorProfileExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileExtrasSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorAccess(context.supabase, data.doctor_id, context.userId);
    const { doctor_id, ...patch } = data;
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) payload[k] = v;
    }
    if (Object.keys(payload).length === 0) return { ok: true, updated: 0 };
    const { error } = await context.supabase
      .from("hc_doctors")
      .update(payload)
      .eq("id", doctor_id);
    if (error) throw new Error(error.message);
    return { ok: true, updated: Object.keys(payload).length };
  });

export const getMyDoctorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hc_doctors")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const StatsSchema = z.object({ doctor_id: z.string().uuid() });

export const getDoctorDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorAccess(context.supabase, data.doctor_id, context.userId);
    const [{ data: doc }, apptResult, practicesResult] = await Promise.all([
      context.supabase
        .from("hc_doctors")
        .select("profile_completeness, trust_score, verification_status, is_public, last_verified_at")
        .eq("id", data.doctor_id)
        .maybeSingle(),
      context.supabase
        .from("hc_appointments")
        .select("id, status, created_at")
        .eq("doctor_id", data.doctor_id)
        .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
      context.supabase
        .from("hc_doctor_practices")
        .select("id, is_active")
        .eq("doctor_id", data.doctor_id),
    ]);
    const appointments = apptResult.data ?? [];
    const practices = practicesResult.data ?? [];
    return {
      profile_completeness: doc?.profile_completeness ?? 0,
      trust_score: doc?.trust_score ?? 0,
      verification_status: doc?.verification_status ?? "pending",
      is_public: doc?.is_public ?? false,
      last_verified_at: doc?.last_verified_at ?? null,
      appointments_30d: appointments.length,
      appointments_confirmed_30d: appointments.filter((a) => a.status === "confirmed").length,
      appointments_completed_30d: appointments.filter((a) => a.status === "completed").length,
      practices_total: practices.length,
      practices_active: practices.filter((p) => p.is_active).length,
    };
  });
