export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  organization_id: string;
  location_id: string;
  doctor_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const ALLOWED_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};
