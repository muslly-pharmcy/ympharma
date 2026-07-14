# Phoenix Phase 6 — Doctor Foundation & Healthcare Directory (CLOSED)

## Scope
Foundation for healthcare providers, locations, patients, and appointments. No UI wiring or data migration.

## Database
Enums: `hc_location_kind`, `hc_verification_status`, `hc_appointment_status`, `hc_specialty_status`.

Tables (all `public.hc_*`, RLS enabled, grants applied):
- `hc_specialties` — global taxonomy, anon SELECT for `active`, admin write.
- `hc_locations` — org-scoped facilities; `healthcare.locations.manage`; anon read for `is_active`.
- `hc_doctors` — org- or user-owned profile; public read gated by `is_public AND verification_status='verified'`; org members read all; owner self-read; verification-fields locked by `hc_doctors_guard_verify` trigger.
- `hc_doctor_specialties`, `hc_doctor_qualifications`, `hc_doctor_locations`, `hc_doctor_availability`, `hc_availability_blocks` — doctor detail tables with parent-doctor RLS derivation.
- `hc_patients` — owner (`user_id`) or org (`healthcare.patients.*`) access.
- `hc_appointments` — patient, doctor, or org-manager visibility; RPC-driven transitions.
- `hc_verification_requests` — submitter + reviewer scoped.

## RPCs (SECURITY DEFINER, `SET search_path = public`, REVOKE anon)
`hc_create_specialty`, `hc_create_location`, `hc_create_doctor`, `hc_submit_verification`, `hc_verify_doctor`, `hc_create_appointment`, `hc_transition_appointment`, `hc_emit_event`.

State machine (appointments): `requested → confirmed|cancelled`; `confirmed → completed|cancelled|no_show`. Others terminal.

## Permissions seeded
`healthcare.doctors.{read,manage,verify}`, `healthcare.locations.manage`, `healthcare.patients.{read,manage}`, `healthcare.appointments.{read,create,manage}` — mapped to owner/admin/manager (+ read for pharmacist/employee where relevant).

## Events (added to `EVENTS` constant)
`SPECIALTY_CREATED`, `LOCATION_CREATED`, `DOCTOR_CREATED`, `DOCTOR_VERIFIED`, `APPOINTMENT_CREATED`, `APPOINTMENT_STATUS_CHANGED` — emitted via `hc_emit_event` → `agent_events`.

## Modules scaffolded
`src/modules/doctors/`, `src/modules/healthcare-locations/`, `src/modules/appointments/`, `src/modules/patients/` — each with `domain/{types,schemas}` and `server/*.functions.ts` bound to the RPCs above through `requireSupabaseAuth`.

## Seed
10 default specialties (internal medicine, pediatrics, cardiology, dermatology, gynecology, dentistry, ophthalmology, ENT, orthopedics, psychiatry).

## Non-goals (deferred)
UI dashboards, calendar renderer, slot generator, patient portal, notifications, insurance linkage, telemedicine, backfill from legacy `profiles`.

Status: **CLOSED**. Await Phase 7.
