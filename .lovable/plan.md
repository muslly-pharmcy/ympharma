## Phoenix Quick Execution — High Impact, Low Credit

Scope: additive UX/discovery improvements only. No DB rewrites, no changes to existing Phoenix foundations.

### 1. Doctor Join Flow (public)
- New route `src/routes/doctor.join.tsx` (public, mobile-first, Arabic-first).
- Reusable form in `src/modules/doctors/components/DoctorJoinForm.tsx` using `react-hook-form` + `zod`.
- Fields: name, specialty (select from existing catalog), city, clinic/hospital, phone, working hours, profile image upload, notes.
- Server function `submitDoctorJoinRequest` in `src/modules/doctors/api/doctor-join.functions.ts` → writes to existing `contact_messages` (or nearest existing intake table) tagged `type = 'doctor_join'` with payload JSON. No schema changes.
- Image upload → existing public bucket if available; else base64 preview only + note in payload (avoids new bucket policies).
- Success screen with "verification pending" state; architecture ready for future admin review UI.

### 2. Visitor Experience
- `src/modules/visitor/components/PlatformUpdates.tsx` — static config-driven "Latest Updates" list (Arabic), lazy-loaded on homepage.
- `src/modules/visitor/components/NotificationOptIn.tsx` — soft opt-in card (medicines / health tips / offers checkboxes). Stores preferences in `localStorage` + posts to existing analytics ingest route. Does NOT call `Notification.requestPermission()`.

### 3. Arabic Medicine Normalization
- Extend `src/modules/catalog/domain/arabicNormalize.ts` (or create if missing) with:
  - transliteration map (vitamin/فيتامين/فتمين → `vitamin`)
  - common misspellings & Latin↔Arabic aliases
  - `normalizeMedicineQuery(input)` returning canonical tokens.
- Wire into existing `UnifiedSearch` medicine branch — pure client transform, no DB changes.

### 4. Homepage Sections
- Update `src/routes/index.tsx` with four clear cards (lazy-loaded):
  1. ابحث عن دواء (→ `/search?type=medicine`)
  2. ابحث عن طبيب (→ `/doctors`)
  3. تثقيف صحي (→ `/sahtak`)
  4. شبكة الصيدليات — قريباً (placeholder card).
- Keep existing sections; add above/interleave without removal.

### 5. Performance
- `React.lazy` + `Suspense` for all new homepage sections and `NotificationOptIn`.
- No admin imports on public routes — verified by grep of `src/routes/index.tsx` and `/doctor/join`.
- Images: `loading="lazy"`, `decoding="async"`.

### Deliverable
Single short report at `docs/engineering/reports/PHOENIX-QUICK-EXECUTION.md` covering: files added, routes, normalization coverage, no-DB-change confirmation.

### Files (new)
- `src/routes/doctor.join.tsx`
- `src/modules/doctors/components/DoctorJoinForm.tsx`
- `src/modules/doctors/api/doctor-join.functions.ts`
- `src/modules/visitor/components/PlatformUpdates.tsx`
- `src/modules/visitor/components/NotificationOptIn.tsx`
- `src/modules/catalog/domain/arabicNormalize.ts` (if absent)
- `docs/engineering/reports/PHOENIX-QUICK-EXECUTION.md`

### Files (modified, additive only)
- `src/routes/index.tsx` — add 4-section grid + lazy sections
- `src/modules/visitor/components/UnifiedSearch.tsx` — call medicine normalizer

### Non-goals
- No migrations, no RLS changes, no new buckets unless one already exists.
- No changes to auth, admin, or existing modules' business logic.
