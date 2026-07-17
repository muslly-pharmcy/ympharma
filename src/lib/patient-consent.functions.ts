import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CONSENT_SCOPES = [
  "medications",
  "vault",
  "appointments",
  "allergies",
  "emergency",
  "prescriptions",
] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const GRANTEE_TYPES = ["doctor", "pharmacy", "hospital", "organization", "family"] as const;
export type GranteeType = (typeof GRANTEE_TYPES)[number];

export interface ConsentRow {
  id: string;
  patient_id: string;
  granted_to_type: string;
  granted_to_id: string;
  scope: string[];
  expires_at: string | null;
  revoked_at: string | null;
  active: boolean;
  created_at: string;
}

/** Resolve (or lazy-create) the caller's hc_patients row id. */
async function resolveMyPatientId(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("hc_patients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Patient profile not found. Open /my-health first to create one.");
  return data.id as string;
}

export const listMyConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConsentRow[]> => {
    const patientId = await resolveMyPatientId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("patient_consents")
      .select("id, patient_id, granted_to_type, granted_to_id, scope, expires_at, revoked_at, active, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ConsentRow[];
  });

export const grantConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        granted_to_type: z.enum(GRANTEE_TYPES),
        granted_to_id: z.string().uuid(),
        scopes: z.array(z.enum(CONSENT_SCOPES)).min(1).max(CONSENT_SCOPES.length),
        expires_at: z.string().datetime().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patientId = await resolveMyPatientId(context.supabase, context.userId);

    const { data: inserted, error } = await context.supabase
      .from("patient_consents")
      .insert({
        patient_id: patientId,
        granted_to_type: data.granted_to_type,
        granted_to_id: data.granted_to_id,
        scope: data.scopes as never,
        expires_at: data.expires_at ?? null,
        active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    return inserted;
  });

export const revokeConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const patientId = await resolveMyPatientId(context.supabase, context.userId);

    const { data: updated, error } = await context.supabase
      .from("patient_consents")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("patient_id", patientId)
      .select("id, active, revoked_at")
      .single();
    if (error) throw error;
    return updated;
  });
