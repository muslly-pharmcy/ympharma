import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createAppointmentSchema, transitionAppointmentSchema,
  type CreateAppointmentInput, type TransitionAppointmentInput,
} from "../domain/schemas";

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateAppointmentInput) => createAppointmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hc_create_appointment", {
      _doctor: data.doctor_id, _location: data.location_id, _patient: data.patient_id,
      _starts_at: data.starts_at, _duration_minutes: data.duration_minutes, _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { appointment_id: id as string };
  });

export const transitionAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TransitionAppointmentInput) => transitionAppointmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("hc_transition_appointment", {
      _appt: data.appointment_id, _new: data.new_status, _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hc_appointments").select("*").order("starts_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
