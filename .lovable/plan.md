
# Phoenix Phase 6 — Doctor Foundation + Healthcare Directory

Foundation only. **No booking UI, no prescription AI, no marketplace.** Mirrors the Phase 4/5 pattern (prefixed tables, RLS via `is_org_member` + `has_org_permission`, security-definer RPCs, event emission, module scaffolds).

## Scope Boundaries

- New tables prefixed `hc_*` (healthcare) to avoid collision with any legacy tables.
- No backfill from any legacy doctor/prescription data.
- No wiring into existing routes/admin pages; module `ui/` barrels only.
- No cron activation, no public booking page, no notifications.

## 1. Database Migration (single migration, 4-step GRANT rule)

New enums:
- `hc_location_kind` — `clinic | hospital | medical_center | pharmacy_clinic`
- `hc_verification_status` — `pending | verified | rejected`
- `hc_appointment_status` — `requested | confirmed | completed | cancelled | no_show`
- `hc_specialty_status` — `active | inactive`

New tables in `public`:

- `hc_specialties` — global catalog. Columns: `id`, `code` (unique slug), `name_ar`, `name_en`, `description_ar`, `description_en`, `status hc_specialty_status`, `sort_order`, timestamps. Not org-scoped (global reference data).
- `hc_locations` — org-scoped facility. Columns: `id`, `organization_id`, `branch_id` (nullable), `kind hc_location_kind`, `name_ar`, `name_en`, `address`, `city`, `governorate`, `country` default `'YE'`, `lat numeric(9,6)`, `lng numeric(9,6)`, `phone`, `email`, `whatsapp`, `working_hours jsonb` (per weekday), `is_active`, `metadata jsonb`, timestamps.
- `hc_doctors` — doctor profile. Columns: `id`, `organization_id` (nullable — independent doctors allowed), `user_id uuid` (nullable FK → `auth.users` for claimed profiles), `slug` (unique), `full_name_ar`, `full_name_en`, `title` (Dr/Prof/etc), `bio_ar`, `bio_en`, `photo_url`, `years_experience int`, `languages text[]`, `gender`, `verification_status hc_verification_status` default `pending`, `verified_at`, `verified_by`, `rejection_reason`, `is_public boolean` default `false`, `metadata jsonb`, timestamps.
- `hc_doctor_specialties` — M:N link (`doctor_id`, `specialty_id`, `is_primary bool`), unique on pair.
- `hc_doctor_qualifications` — degrees/certifications. `doctor_id`, `title`, `institution`, `year int`, `country`, `document_url` (nullable, private).
- `hc_doctor_locations` — M:N doctor ↔ location with `role` (`consultant | resident | visiting | owner`).
- `hc_doctor_availability` — weekly recurring schedule. `doctor_id`, `location_id`, `weekday smallint` (0-6), `start_time time`, `end_time time`, `slot_duration_minutes int` default 30, `is_active`.
- `hc_availability_blocks` — one-off blocked ranges. `doctor_id`, `location_id` (nullable), `starts_at timestamptz`, `ends_at timestamptz`, `reason`.
- `hc_patients` — patient shell (foundation only). `id`, `organization_id` (nullable), `user_id` (nullable), `full_name`, `phone`, `date_of_birth`, `gender`, `national_id_hash` (SHA256, nullable), `metadata jsonb`, timestamps. RLS: owner (`auth.uid() = user_id`) OR org member with `patients.read`.
- `hc_appointments` — appointment entity. `id`, `organization_id`, `location_id`, `doctor_id`, `patient_id`, `starts_at timestamptz`, `ends_at timestamptz`, `status hc_appointment_status` default `requested`, `reason`, `notes` (private), `created_by`, `confirmed_at`, `completed_at`, `cancelled_at`, `cancel_reason`, timestamps. Constraint: `ends_at > starts_at`. Index on `(doctor_id, starts_at)`.
- `hc_verification_requests` — verification workflow. `doctor_id`, `submitted_by`, `documents jsonb`, `status hc_verification_status`, `reviewer_id`, `review_notes`, `reviewed_at`, timestamps.

Each `CREATE TABLE` followed by:
```
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;
-- anon GRANT SELECT only on: hc_specialties, hc_locations, hc_doctors (public rows), hc_doctor_specialties, hc_doctor_locations
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
```

RLS matrix:
- `hc_specialties`: public SELECT of `status='active'`; write via `has_role('admin')` only.
- `hc_locations`: public SELECT of `is_active=true`; write via `has_org_permission(auth.uid(), org, 'healthcare.locations.manage')`.
- `hc_doctors`: public SELECT of `is_public=true AND verification_status='verified'`; org-member SELECT of all org rows via `is_org_member(org, auth.uid())`; write via `has_org_permission(..., 'healthcare.doctors.manage')`; the doctor themselves (`user_id = auth.uid()`) can SELECT/UPDATE own row (excluding verification fields, enforced by trigger).
- `hc_doctor_specialties` / `hc_doctor_locations` / `hc_doctor_qualifications`: read follows parent doctor visibility; write via `healthcare.doctors.manage`.
- `hc_doctor_availability` / `hc_availability_blocks`: public read for verified public doctors; write via `healthcare.doctors.manage` OR the doctor themselves.
- `hc_patients`: NO public read. Owner OR org member with `healthcare.patients.read`; write via `healthcare.patients.manage`.
- `hc_appointments`: NO public read. Patient owner OR doctor's `user_id` OR org member with `healthcare.appointments.read`; insert requires `healthcare.appointments.create` OR patient self-request (constrained by trigger to `status='requested'`); status transitions via RPC only.
- `hc_verification_requests`: doctor submitter OR org admin with `healthcare.doctors.verify`; writes to `status` restricted to reviewers via RPC.

Movement/audit ledger: verification decisions and status transitions write to existing `identity_audit_events` (entity `healthcare.*`).

New permission keys seeded into `public.permissions` + mapped in `role_permissions`:
- `healthcare.doctors.read` → Owner, Admin, Manager, Pharmacist, Employee
- `healthcare.doctors.manage` → Owner, Admin, Manager
- `healthcare.doctors.verify` → Owner, Admin
- `healthcare.locations.manage` → Owner, Admin, Manager
- `healthcare.patients.read` → Owner, Admin, Manager, Pharmacist
- `healthcare.patients.manage` → Owner, Admin, Manager
- `healthcare.appointments.read` → Owner, Admin, Manager, Pharmacist, Employee
- `healthcare.appointments.create` → Owner, Admin, Manager, Pharmacist, Employee
- `healthcare.appointments.manage` → Owner, Admin, Manager

Security-definer RPCs (`SET search_path = public`, `REVOKE ... FROM anon, PUBLIC`):
- `hc_create_doctor(payload jsonb)` — inserts doctor (+ specialties, qualifications, locations); emits `DOCTOR_CREATED`.
- `hc_submit_verification(doctor_id, documents jsonb)` — creates `hc_verification_requests`, sets doctor status to `pending`.
- `hc_verify_doctor(doctor_id, decision, notes)` — checks `healthcare.doctors.verify`; updates `verification_status`, `verified_at`, `verified_by`; emits `DOCTOR_VERIFIED` on approval; audit-log.
- `hc_create_specialty(...)` — admin-only; emits `SPECIALTY_CREATED`.
- `hc_create_location(payload jsonb)` — emits `LOCATION_CREATED`.
- `hc_create_appointment(doctor_id, location_id, patient_id, starts_at, reason)` — checks slot vs `hc_doctor_availability` + `hc_availability_blocks` + existing appointments; inserts with `status='requested'`; emits `APPOINTMENT_CREATED`.
- `hc_transition_appointment(appointment_id, new_status, reason)` — validates state machine (`requested → confirmed → completed`, plus `→ cancelled` / `→ no_show`); writes timestamps; emits status-change event.

Triggers:
- `hc_doctors` INSERT → emit `DOCTOR_CREATED` via `agent_events` sink.
- `hc_doctors` UPDATE on `verification_status='verified'` → emit `DOCTOR_VERIFIED`.
- `hc_locations` INSERT → `LOCATION_CREATED`.
- `hc_appointments` INSERT → `APPOINTMENT_CREATED`.
- Reuse `update_updated_at_column` for `updated_at`.
- Doctor self-update trigger: block changes to `verification_status`, `verified_at`, `verified_by`, `is_public` unless caller has `healthcare.doctors.verify`.

Indexes: `hc_doctors(organization_id)`, `hc_doctors(slug)`, `hc_doctors(verification_status, is_public)`, `hc_appointments(doctor_id, starts_at)`, `hc_appointments(patient_id)`, `hc_locations(organization_id, is_active)`, trigram indexes on `hc_doctors(full_name_ar, full_name_en)` and `hc_locations(name_ar, name_en)` for future search.

## 2. Module Scaffold — `src/modules/doctors/`

```
doctors/
  README.md
  domain/
    types.ts             # Doctor, Specialty, Qualification, DoctorLocation, VerificationStatus
    schemas.ts           # Zod: createDoctor, updateDoctor, submitVerification
    verificationState.ts # pure state-machine helpers
  data/
    queries.ts           # Data-API read helpers (public directory)
  server/
    doctors.functions.ts     # listDoctors, getDoctor, createDoctor, updateDoctor
    specialties.functions.ts # listSpecialties, createSpecialty
    verification.functions.ts # submitVerification, verifyDoctor
  events/
    schemas.ts
  ui/
    index.ts             # empty barrel
  index.ts
```

## 3. Module Scaffold — `src/modules/healthcare-locations/`

```
healthcare-locations/
  README.md
  domain/{types.ts,schemas.ts}
  data/queries.ts
  server/locations.functions.ts   # listLocations, getLocation, createLocation, updateLocation
  events/schemas.ts
  ui/index.ts
  index.ts
```

## 4. Module Scaffold — `src/modules/appointments/`

```
appointments/
  README.md
  domain/
    types.ts
    schemas.ts
    appointmentState.ts  # allowed status transitions
  data/queries.ts
  server/
    appointments.functions.ts   # listAppointments, getAppointment, createAppointment, transitionAppointment
    availability.functions.ts   # getDoctorAvailability, setWeeklySchedule, addBlock
  events/schemas.ts
  ui/index.ts
  index.ts
```

## 5. Module Scaffold — `src/modules/patients/`

```
patients/
  README.md
  domain/{types.ts,schemas.ts}
  data/queries.ts
  server/patients.functions.ts    # listPatients (org-scoped), getPatient, createPatient, updatePatient
  events/schemas.ts
  ui/index.ts
  index.ts
```

All server fns: `createServerFn` + `.middleware([requireSupabaseAuth])` + Zod validator + `context.supabase` (RLS-scoped) or call security-definer RPC. No `supabaseAdmin` at module scope.

## 6. Event Registry Updates

`src/core/events/constants.ts` — add:
- `DOCTOR_CREATED`
- `DOCTOR_VERIFIED`
- `SPECIALTY_CREATED`
- `LOCATION_CREATED`
- `APPOINTMENT_CREATED`
- `APPOINTMENT_STATUS_CHANGED`

Register Zod schemas in `EventRegistry.ts`. Update `docs/engineering/standards/EVENT-CATALOG.md`.

## 7. Import-Graph Guard

Update `scripts/check-imports.ts` allow-list so `modules/doctors`, `modules/healthcare-locations`, `modules/appointments`, `modules/patients` follow the same layer rules as `modules/catalog` and `modules/inventory` (domain no deps; server can import platform/core; ui cannot import server/*).

## 8. Tests

- `src/__tests__/unit/modules/doctors/schemas.test.ts` — Zod validation (required fields, slug format, languages array).
- `src/__tests__/unit/modules/doctors/verification-state.test.ts` — state machine (`pending → verified`, `pending → rejected`, `verified → pending` blocked).
- `src/__tests__/unit/modules/appointments/state-machine.test.ts` — transitions and terminal states.
- `src/__tests__/unit/modules/appointments/availability.test.ts` — pure slot-overlap detection.
- `src/__tests__/unit/modules/healthcare-locations/schemas.test.ts` — Zod (coordinates range, working_hours shape).
- `src/__tests__/unit/modules/patients/schemas.test.ts` — Zod (national_id hashing helper, DOB in past).
- `src/__tests__/unit/platform/permissions/healthcare-permissions.test.ts` — permission-key registration.

## 9. Documentation

`docs/engineering/reports/PHOENIX-P6-doctors.md`:
- Architecture (ASCII diagram: directory → doctors → verification → appointments)
- Data model (table + column matrix)
- Security model (RLS matrix per table × role × audience)
- Verification workflow diagram (pending → verified/rejected)
- Appointment state machine diagram
- Event flow (trigger → agent_events → dispatcher)
- Future booking roadmap (Phase 7+ notes: public booking UI, notifications, e-prescriptions, payments, reviews, telemedicine)
- Migration readiness checklist for any future legacy data import
- Explicit non-goals (no booking UI, no prescription AI, no cron, no notifications, no marketplace)

## Technical Notes

- All new tables use `gen_random_uuid()` PKs + `update_updated_at_column` trigger.
- Reuses Phase 3 signatures: `is_org_member(_org uuid, _user uuid)` and `has_org_permission(_user_id uuid, _org_id uuid, _permission text, _branch_id uuid DEFAULT NULL)`.
- `permissions` inserts use column `key`; `role_permissions` uses `permission_key`.
- Emits events through Phase 2 EventPublisher pattern; DB triggers write to `agent_events`.
- Anon GRANTs limited to directory tables where policies filter to public+verified rows only. `hc_patients`, `hc_appointments`, `hc_doctor_qualifications`, `hc_verification_requests` get NO anon GRANT.

## Deliverables Summary

1. One migration (enums + 11 tables + grants + RLS + 7 RPCs + triggers + permission seed).
2. Four module scaffolds (`doctors`, `healthcare-locations`, `appointments`, `patients`) with domain / data / server / events / empty UI barrel.
3. Event constants + registry + catalog doc update.
4. Import-graph guard update.
5. Seven unit tests.
6. Phase 6 completion report.

Stop after Phase 6. Await Phase 7.
