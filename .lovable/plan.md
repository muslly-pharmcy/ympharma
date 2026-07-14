
# Phoenix OMEGA Slice 1 — Foundation Only

Additive extensions to existing Phoenix modules. Zero renames, zero drops, zero breaking changes. Reuses existing tables (`hc_doctors`, `hc_doctor_practices`, `hc_doctor_join_submissions`, `hc_verification_requests`) and existing patterns (Event Bus, PermissionService, arabicNormalize).

Depth: **foundation only** — schema + server functions + minimal admin/doctor UI wiring. Full patient-facing polish deferred to a later slice.

---

## 1. Migration: `phoenix_slice1_doctor_completion`

### 1a. Extend `hc_doctors` (additive columns only)
```
academic_titles       text[]   default '{}'   -- e.g. Prof., Assoc. Prof.
medical_titles        text[]   default '{}'   -- e.g. Consultant, Specialist
sub_specialties       text[]   default '{}'
awards                jsonb    default '[]'
services              jsonb    default '[]'   -- [{name_ar,name_en,fee_yer,duration_min}]
accepted_insurance    uuid[]   default '{}'   -- FK-ish to ins_companies
consultation_fee_yer  integer
followup_fee_yer      integer
video_urls            text[]   default '{}'
qr_token              text     unique          -- for /doctors/qr/$token deep link
seo_title             text
seo_description       text
trust_score           integer  default 0       -- 0-100 computed
profile_completeness  integer  default 0       -- 0-100 computed
last_verified_at      timestamptz
```
All new columns nullable/defaulted → no existing row breakage.

### 1b. Extend `hc_doctor_practices`
```
create type hc_facility_kind as enum (
  'gov_hospital','private_hospital','military_hospital','teaching_hospital',
  'clinic','medical_center','charity','ngo'
);
alter table hc_doctor_practices
  add column facility_kind hc_facility_kind,
  add column whatsapp        text,
  add column assistant_phone text,
  add column booking_method  text check (booking_method in ('walk_in','phone','whatsapp','online')),
  add column images          text[] default '{}',
  add column lat             numeric(9,6),
  add column lng             numeric(9,6),
  add column emergency       boolean default false,
  add column telemedicine    boolean default false;
```

### 1c. Extend `hc_doctor_join_submissions`
```
duplicate_of_doctor_id uuid references hc_doctors(id),
duplicate_score        numeric(5,2),
photo_review_status    text check (photo_review_status in ('pending','approved','rejected')),
photo_review_notes     text,
admin_notes            text
```

### 1d. RPCs (`SECURITY DEFINER`, `SET search_path = public`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`)
- `hc_compute_profile_completeness(_doctor_id uuid) returns int` — weighted score across bio, photo, specialties, practices, services, fees.
- `hc_compute_trust_score(_doctor_id uuid) returns int` — verification + source_tier + completeness + review count.
- `hc_detect_join_duplicates(_submission_id uuid) returns table(...)` — fuzzy match on normalized name + phone against `hc_doctors`.
- `hc_approve_join_submission(_submission_id uuid, _notes text)` — creates verified `hc_doctors` row, emits `DOCTOR_JOIN_APPROVED`, marks submission `approved`.
- `hc_reject_join_submission(_submission_id uuid, _reason text)` — marks rejected, emits event.
- All wrapped by inserts into `identity_audit_events`.

### 1e. Trigger
`hc_doctors_after_write` recomputes `profile_completeness` + `trust_score` on insert/update.

### 1f. Grants + RLS
No new tables; existing RLS on parent tables covers new columns. Grants unchanged.

---

## 2. Server functions (all additive, no moves)

### `src/modules/doctors/functions/profile.functions.ts` (new)
- `updateDoctorProfileExtras` — owner/admin, uses `requireSupabaseAuth`.
- `listDoctorServices`, `upsertDoctorService`, `deleteDoctorService`.
- `getDoctorDashboardStats` — visits/appointments/trust counters from existing tables.

### `src/modules/doctors/functions/practices.functions.ts` (new)
- `listMyPractices`, `upsertPractice`, `deletePractice`, `setPracticeSchedule` (wraps `hc_doctor_availability`).

### `src/modules/doctors/functions/join-admin.functions.ts` (new)
- `listJoinSubmissions({ status, page })` — admin only via `has_role('admin')`.
- `getJoinSubmission($id)` — returns submission + duplicate candidates + signed URL for photo.
- `approveJoinSubmission`, `rejectJoinSubmission`, `flagJoinPhoto`.

All admin fns verify `has_role(context.userId,'admin')` inside the handler before privileged work.

---

## 3. Routes (foundation-only UI)

Under existing `_authenticated/` gate:

- `src/routes/_authenticated/doctor/dashboard.tsx` — stats cards + completeness meter + trust badge.
- `src/routes/_authenticated/doctor/profile.tsx` — form for academic/medical titles, sub-specialties, awards, fees, services, videos, SEO.
- `src/routes/_authenticated/doctor/practices.tsx` — list/add/edit practices with facility_kind selector, coords, WhatsApp, booking method.
- `src/routes/_authenticated/admin/doctor-join-queue.tsx` — verification queue with filters, duplicate hints, photo review, approve/reject.
- Extend existing `src/routes/admin-hub.tsx` with a "Healthcare" KPI card (doctors verified, pending join, appointments 7d, active practices) — read from a single new `getHealthcareKpis` server fn.

Each route uses existing Medical Design System (`src/components/medical/*`), skeletons, empty states, RTL. Lazy component split via TanStack's default (no exports).

---

## 4. Not in this slice (deferred)
Sections 3–9, 12–13, 16 marked in the directive stay untouched. QR image rendering, video player, sponsored/marketplace hooks, AI contracts, Sahtak knowledge, product-intelligence expansion, public directory redesign — **not** in Slice 1.

---

## 5. Validation gate (blocks completion)
1. `tsgo` clean.
2. `bun run build:dev` exits 0.
3. `scripts/check-imports.ts` passes.
4. No existing route/module renamed or deleted.
5. Report: `docs/engineering/reports/PHOENIX-OMEGA-SLICE1.md` — schema diff, files added/modified, guard status, zero-regression checklist.

`PROJECT_STATE.yaml` and `CHANGELOG.md` **not** touched (per directive).

---

## Technical notes
- All new columns default-safe → no data backfill required.
- `qr_token` generated lazily on first read; no bulk update.
- Trust/completeness triggers use `pg_notify` only if event bus already listens; otherwise pure UPDATE.
- Photo review uses existing `prescription-review` signed-URL pattern (10-min TTL, audited).
- Server functions live under `functions/` (never `server/`) per prior build-recovery rule.
- Admin routes lazy-load heavy tables via TanStack's automatic code splitting (no exported components).
