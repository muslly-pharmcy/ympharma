// Phoenix Slice 1 — multi-practice management.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FACILITY_KINDS = [
  "gov_hospital",
  "private_hospital",
  "military_hospital",
  "teaching_hospital",
  "clinic",
  "medical_center",
  "charity",
  "ngo",
] as const;

const BOOKING_METHODS = ["walk_in", "phone", "whatsapp", "online", "assistant"] as const;

const WorkingHoursSchema = z.record(
  z.string(),
  z.array(z.object({ open: z.string(), close: z.string() })),
);

const UpsertPracticeSchema = z.object({
  id: z.string().uuid().optional(),
  doctor_id: z.string().uuid(),
  location_id: z.string().uuid(),
  practice_type: z.enum(FACILITY_KINDS),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  assistant_phone: z.string().max(30).optional().nullable(),
  booking_method: z.enum(BOOKING_METHODS).default("phone"),
  consultation_duration_min: z.number().int().min(5).max(600).optional().nullable(),
  working_hours: WorkingHoursSchema.optional(),
  gallery: z.array(z.string().url()).max(20).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  emergency_available: z.boolean().optional(),
  telemedicine_ready: z.boolean().optional(),
  is_primary: z.boolean().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertDoctorAccess(supabase: any, doctorId: string, userId: string) {
  const { data, error } = await supabase
    .from("hc_doctors")
    .select("id, user_id")
    .eq("id", doctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("doctor not found");
  if (data.user_id !== userId) {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("forbidden");
  }
}

export const listMyPractices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ doctor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorAccess(context.supabase, data.doctor_id, context.userId);
    const { data: rows, error } = await context.supabase
      .from("hc_doctor_practices")
      .select("*, location:hc_locations(id, name_ar, name_en, city, governorate, kind)")
      .eq("doctor_id", data.doctor_id)
      .order("is_primary", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertPracticeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorAccess(context.supabase, data.doctor_id, context.userId);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) payload[k] = v;
    }
    let id = data.id;
    if (id) {
      const { error } = await context.supabase
        .from("hc_doctor_practices")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("hc_doctor_practices")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = (inserted as { id: string }).id;
    }
    return { ok: true, id };
  });

export const deletePractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), doctor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertDoctorAccess(context.supabase, data.doctor_id, context.userId);
    const { error } = await context.supabase
      .from("hc_doctor_practices")
      .delete()
      .eq("id", data.id)
      .eq("doctor_id", data.doctor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPublicLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hc_locations")
      .select("id, name_ar, name_en, city, governorate, kind")
      .eq("is_active", true)
      .order("name_ar")
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
