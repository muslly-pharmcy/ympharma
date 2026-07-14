# Phoenix Omega — Slice 1: Doctor Network End-to-End

Executing Sections 1, 2, 11, 12 only. Sections 3–10, 13–16 deferred to later slices per your one-slice-per-turn pacing. Purely additive — no renames, no dropped tables, no contract changes to existing Phoenix phases.

## Scope

**In:** Doctor profile completion, multi-practice locations, join/verification workflow, data-quality normalization + trust score, doctor-facing dashboard shell.
**Out this turn:** Public search ranking rewrite, hospital/lab directory pages, admin owner KPIs, marketplace prep, AI contracts, Sahtak knowledge, product intelligence completion.

## Database migration (additive)

Extend existing `hc_doctors`, `hc_doctor_locations`, `hc_verification_requests` — no drops.

1. `hc_doctors` add nullable columns: `academic_title`, `medical_title`, `sub_specialties text[]`, `years_experience int`, `biography_ar text`, `biography_en text`, `languages text[]`, `certificates jsonb`, `awards jsonb`, `services jsonb`, `accepted_insurance uuid[]`, `consultation_fee_min numeric`, `consultation_fee_max numeric`, `currency text default 'YER'`, `gallery jsonb`, `intro_video_url text`, `qr_token text unique`, `seo_title_ar text`, `seo_desc_ar text`, `telemedicine_ready boolean default false`, `emergency_available boolean default false`, `profile_completeness int default 0`, `trust_score int default 0`, `last_verified_at timestamptz`, `source text default 'self'`, `confidence_score int default 0`.
2. New table `hc_doctor_practices` (per-location practice details): `doctor_id`, `location_id`, `practice_type` enum (`gov_hospital|private_hospital|military|teaching|clinic|medical_center|charity|ngo`), `working_hours jsonb`, `phone`, `whatsapp`, `assistant_phone`, `booking_method` enum (`walk_in|phone|whatsapp|online|assistant`), `consultation_duration_min int`, `coordinates point`, `gallery jsonb`, `is_primary bool`, timestamps. RLS: public read where doctor is verified; owner/org staff write. GRANT to authenticated + service_role, SELECT to anon on verified rows.
3. `hc_verification_requests` add: `duplicate_of uuid null`, `photo_review_status text`, `reviewer_notes text`, `status_history jsonb default '[]'`.
4. New table `hc_doctor_join_submissions` for the public /doctor/join intake (pre-verification landing before it becomes a real hc_doctors row). Fields: contact info, claimed specialties, uploaded IDs (storage refs), auto-normalized name (Arabic-folded), phone_e164, duplicate_score, status enum (`new|reviewing|approved|rejected|duplicate`), reviewer_id, decision_at.
5. RPCs (all `SECURITY DEFINER`, revoked from public, granted per role):
   - `hc_recompute_profile_completeness(_doctor uuid) returns int`
   - `hc_recompute_trust_score(_doctor uuid) returns int`
   - `hc_detect_doctor_duplicates(_name_ar text, _phone text) returns setof jsonb`
   - `hc_normalize_doctor_row(_doctor uuid)` — Arabic folding, phone E.164, slug regeneration, sets `last_verified_at` when admin-called.
   - `hc_approve_join_submission(_submission uuid)` — creates verified `hc_doctors` row, links locations, seeds `hc_doctor_practices`.
6. Triggers: on `hc_doctors` INSERT/UPDATE → recompute completeness + trust; on `hc_doctor_practices` change → recompute completeness.
7. Storage bucket `doctor-media` (public read for verified only via signed URLs on private, or bucket policy).

## Server functions (additive, all under `src/modules/doctors/functions/`)

- `getDoctorProfileFull.functions.ts` — merges doctor + practices + specialties + qualifications; public.
- `updateDoctorProfile.functions.ts` — `requireSupabaseAuth`, owner or org admin only.
- `listDoctorPractices.functions.ts` / `upsertDoctorPractice.functions.ts` / `deleteDoctorPractice.functions.ts`.
- `submitDoctorJoin.functions.ts` — public, rate-limited via `rate_limit_buckets`, runs duplicate detection, writes to `hc_doctor_join_submissions`.
- `listJoinSubmissions.functions.ts` / `reviewJoinSubmission.functions.ts` — admin-gated via `has_role`.
- `getDoctorDashboardStats.functions.ts` — profile views, appointments, ranking, trust; `requireSupabaseAuth`, doctor-owner scoped.

All handlers load `client.server` via `await import(...)` when they need admin.

## Frontend

**Public / patient-facing** (top-level routes, SSR on, no auth gate):
- `src/routes/doctors.$slug.tsx` — extend existing profile page: new tabs (About, Practices, Services, Insurance, Reviews-stub), gallery, QR download, structured data (JSON-LD Physician), full head() with og:image from doctor photo.
- `src/components/doctors/PracticeCard.tsx`, `ServiceList.tsx`, `InsuranceBadges.tsx`, `CredentialsList.tsx`, `TrustScoreMeter.tsx`, `ProfileCompletenessRing.tsx` (Arabic-first, uses existing medical design tokens).

**Doctor join** (public):
- Extend `src/routes/doctor.join.tsx` → multi-step wizard (contact → credentials → practices → media upload → review). Uses `submitDoctorJoin`.

**Doctor dashboard** (`_authenticated/doctor/*`):
- `src/routes/_authenticated/doctor/profile-editor.tsx` — full profile editor with completeness ring.
- `src/routes/_authenticated/doctor/practices.tsx` — CRUD list for practices.
- `src/routes/_authenticated/doctor/dashboard.tsx` — stats cards (visits, appointments, ranking, trust).

**Admin verification queue** (`_authenticated/admin/*`):
- `src/routes/_authenticated/admin/doctor-join-queue.tsx` — list `hc_doctor_join_submissions`, filter by status, duplicate warnings, approve/reject/mark-duplicate actions calling `reviewJoinSubmission`.

## Data quality helpers (Section 12)

- `src/lib/normalize/arabicName.ts` — folds diacritics, unifies ا/أ/إ/آ, ة/ه, ى/ي; canonical form for dedupe.
- `src/lib/normalize/phone.ts` — Yemen-aware E.164 normalizer.
- `src/lib/doctors/duplicateScore.ts` — Levenshtein + phone match + specialty overlap → 0–100.
- Reuse in `submitDoctorJoin`, `hc_normalize_doctor_row`, and a one-off backfill server function `backfillDoctorNormalization` (admin-only, callable from admin queue).

## Security

- Every new RPC: `SECURITY DEFINER`, explicit `search_path=public`, `REVOKE ALL FROM PUBLIC`, granular `GRANT EXECUTE TO authenticated` (or `anon` only for the doctor-profile public read RPC).
- Every new table: GRANT block in same migration, RLS enabled, policies scoped to `auth.uid()` + `has_role`/`has_org_permission`.
- No `service_role` in client. Admin route gated by existing `_authenticated` layout plus `has_role('admin')` check in loader.

## Validation gates before finishing

1. `bun run build:dev` exits 0.
2. `tsgo` clean.
3. Import guards (`scripts/check-imports.ts`) pass.
4. Layer guards pass.
5. `supabase--linter` re-run; fix new findings.
6. No changes to `src/integrations/supabase/*` generated files.

## Deliverable

`docs/engineering/reports/PHOENIX-OMEGA-S1-doctor-network.md` — modules completed, files added/modified, RPC list, security summary, remaining roadmap (Sections 3, 5–10, 13, 16), build/typecheck/guard status, zero-breaking-change confirmation.

Then stop and wait for your go-signal for Slice 2 (your pick: Public UX + Search, Admin Dashboard, or Foundation Completion).
