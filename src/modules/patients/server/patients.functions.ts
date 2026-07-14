import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPatientSchema, type CreatePatientInput } from "../domain/schemas";

export const createPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreatePatientInput) => createPatientSchema.parse(d))
  .handler(async ({ data, context }) => {
    const insertPayload = {
      organization_id: data.organization_id ?? null,
      user_id: context.userId,
      full_name: data.full_name,
      phone: data.phone ?? null,
      date_of_birth: data.date_of_birth ?? null,
      gender: data.gender ?? null,
      metadata: data.metadata,
    };
    const { data: row, error } = await context.supabase
      .from("hc_patients").insert(insertPayload as never).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "insert failed");
    return { patient_id: (row as { id: string }).id };
  });

export const listMyPatients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hc_patients").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
