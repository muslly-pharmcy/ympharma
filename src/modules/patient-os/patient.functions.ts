import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Phase 11 — Patient OS server functions.
 * All handlers rely on RLS: policies are scoped to auth.uid() via
 * public.patient_belongs_to_current_user.
 */

// ---------------- Identity ----------------

/** Return (or lazily create) the hc_patients row for the signed-in user. */
export const getOrCreateMyPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const { data: existing, error: readErr } = await supabase
      .from("hc_patients")
      .select("id, full_name, phone, date_of_birth, gender")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (existing) return existing;

    const fallbackName =
      (claims?.user_metadata as { full_name?: string } | undefined)?.full_name ??
      (claims?.email as string | undefined) ??
      "مريض جديد";

    const { data, error } = await supabase
      .from("hc_patients")
      .insert({ user_id: userId, full_name: fallbackName })
      .select("id, full_name, phone, date_of_birth, gender")
      .single();
    if (error) throw error;
    return data;
  });

// ---------------- Medications ----------------

export const listMyMedications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("patient_medications")
      .select("id, medicine_name, dosage, frequency, route, start_date, end_date, active, source, notes")
      .eq("patient_id", data.patientId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addMyMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        patientId: z.string().uuid(),
        medicineName: z.string().min(1).max(200),
        dosage: z.string().max(120).optional().nullable(),
        frequency: z.string().max(120).optional().nullable(),
        route: z.string().max(60).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("patient_medications")
      .insert({
        patient_id: data.patientId,
        medicine_name: data.medicineName,
        dosage: data.dosage ?? null,
        frequency: data.frequency ?? null,
        route: data.route ?? null,
        notes: data.notes ?? null,
        source: "self_reported",
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const stopMyMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { medicationId: string }) =>
    z.object({ medicationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("patient_medications")
      .update({ active: false, end_date: new Date().toISOString().slice(0, 10) })
      .eq("id", data.medicationId);
    if (error) throw error;
    return { ok: true };
  });

// ---------------- Timeline ----------------

export const getMyTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string; limit?: number }) =>
    z.object({ patientId: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("patient_health_events")
      .select("id, event_type, event_date, summary, payload")
      .eq("patient_id", data.patientId)
      .order("event_date", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw error;
    return rows ?? [];
  });

// ---------------- Vault ----------------

export const listMyVaultFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("medical_vault_files")
      .select("id, file_type, title, storage_path, mime_type, size_bytes, created_at")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const registerVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        patientId: z.string().uuid(),
        fileType: z.enum(["prescription", "scan", "report", "image", "lab_result", "certificate", "other"]),
        title: z.string().min(1).max(200),
        storagePath: z.string().min(1).max(500),
        mimeType: z.string().max(120).optional().nullable(),
        sizeBytes: z.number().int().nonnegative().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("medical_vault_files")
      .insert({
        patient_id: data.patientId,
        file_type: data.fileType,
        title: data.title,
        storage_path: data.storagePath,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const getVaultDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileId: string }) =>
    z.object({ fileId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("medical_vault_files")
      .select("storage_path")
      .eq("id", data.fileId)
      .single();
    if (error) throw error;
    const { data: signed, error: signErr } = await context.supabase.storage
      .from("medical-vault")
      .createSignedUrl(file.storage_path, 300);
    if (signErr) throw signErr;
    return { url: signed.signedUrl };
  });

// ---------------- Family ----------------

export const listMyFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string }) =>
    z.object({ patientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("family_health_accounts")
      .select("id, member_patient_id, relationship, access_level, active, invited_at, accepted_at")
      .eq("owner_patient_id", data.patientId);
    if (error) throw error;
    return rows ?? [];
  });
