// Phoenix Slice 1 — admin join queue workflow.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

const ListSchema = z.object({
  status: z.enum(["new", "reviewing", "approved", "rejected", "duplicate", "all"]).default("new"),
  page: z.number().int().min(1).max(500).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const listJoinSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    let q = context.supabase
      .from("hc_doctor_join_submissions")
      .select(
        "id, full_name_ar, full_name_en, title, phone, phone_e164, email, city, governorate, claimed_specialties, status, duplicate_of, duplicate_score, photo_review_status, reviewer_notes, admin_notes, created_at, decision_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const getJoinSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: sub, error } = await context.supabase
      .from("hc_doctor_join_submissions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("submission not found");
    const row = sub as { full_name_ar: string; phone: string | null };
    const { data: dupes } = await context.supabase.rpc("hc_detect_doctor_duplicates", {
      _name_ar: row.full_name_ar,
      _phone: row.phone ?? "",
    });
    return { submission: sub, duplicates: dupes ?? [] };
  });

export const approveJoinSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: newDoctorId, error } = await context.supabase.rpc(
      "hc_approve_join_submission",
      { _submission: data.id },
    );
    if (error) throw new Error(error.message);
    return { doctor_id: newDoctorId as string };
  });

export const rejectJoinSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "hc_reject_join_submission" as any,
      { _submission: data.id, _reason: data.reason },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const flagJoinPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected"]),
      notes: z.string().max(500).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "hc_flag_join_photo" as any,
      { _submission: data.id, _status: data.status, _notes: data.notes ?? "" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getHealthcareKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "hc_healthcare_kpis" as any,
    );
    if (error) throw new Error(error.message);
    return (data ?? {}) as Record<string, number>;
  });
