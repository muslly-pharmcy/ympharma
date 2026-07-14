import { z } from "zod";

export const createAppointmentSchema = z.object({
  doctor_id: z.string().uuid(),
  location_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(240).default(30),
  reason: z.string().max(500).nullish(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const transitionAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  new_status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
  reason: z.string().max(500).nullish(),
});
export type TransitionAppointmentInput = z.infer<typeof transitionAppointmentSchema>;
