# PHOENIX QUICK EXECUTION — Report

Date: 2026-07-14
Scope: Additive UX + discovery improvements. No DB migrations. No changes to existing Phoenix foundations.

## Delivered

### 1. Doctor joining flow (public)
- Route: `/doctor/join` → `src/routes/doctor.join.tsx` (SEO head, Arabic-first, mobile-first).
- Reusable form: `src/modules/doctors/components/DoctorJoinForm.tsx`
  - Fields: full name, specialty, city, clinic/hospital, phone, email (optional), working hours, notes, profile photo (≤2MB, base64 preview), `request_verification` flag.
  - Zod validation, inline errors, submit + success states — architecture ready for a future admin verification review UI.
- Server route: `src/routes/api/public/doctor-join.ts`
  - Validates payload, folds structured JSON into existing `contact_messages` (no schema change), hashes IP.

### 2. Visitor experience
- `src/modules/visitor/components/PlatformUpdates.tsx` — "آخر تحديثات المنصة" (lazy-loaded, static config, RTL).
- `src/modules/visitor/components/NotificationOptIn.tsx` — soft in-page opt-in for medicines / tips / offers.
  - Persists in `localStorage` (`muslly.notify.prefs.v1`) + emits `notification_optin_saved` analytics event.
  - Never calls `Notification.requestPermission()`.

### 3. Arabic medicine normalization
- `src/modules/catalog/domain/medicineNormalize.ts`
  - `normalizeMedicineQuery(input)` and `medicineSearchTerms(input)`.
  - Handles: tashkeel, alef/ya/ta-marbuta, Latin diacritics, common Arabic ↔ Latin drug names, misspellings, bigram merges (`vit c` → `vitamin_c`).
  - Coverage examples: `فتمين`, `فيتامين`, `vitamin`, `vit c`, `فتامين`, `بنادول`/`باندول`, `اموكسسلين`, `أوجمنتين`, `omega 3` — all map to a stable canonical token per family.
- Wired into `UnifiedSearch.tsx` (medicines branch only).

### 4. Homepage sections
- Added `DiscoveryGrid` in `src/routes/index.tsx` with four cards:
  1. ابحث عن دواء (`/products`)
  2. ابحث عن طبيب (`/doctors`)
  3. تثقيف صحي (`/sahtak`)
  4. شبكة الصيدليات — قريباً (placeholder → `/doctor/join`)
- Lazy-mounted `PlatformUpdates` and `NotificationOptIn` alongside existing sections.

### 5. Performance / hygiene
- All new homepage sections use `React.lazy` + `Suspense`.
- No admin bundle imports on public routes (verified — only `visitor/*`, `doctors/*`, `catalog/*` modules imported).
- Images: `loading="lazy"`, `decoding="async"`.
- Typecheck: PASS.

## Non-changes (as instructed)
- No SQL migrations.
- No RLS or bucket changes.
- No modifications to existing Phoenix modules beyond additive imports.
- `EventName` union extended by two entries (`notification_optin_saved`, `doctor_join_submitted`) — additive, no removals.

## Follow-ups (future turns, out of scope)
- Admin review UI for doctor-join submissions (filter `contact_messages.message LIKE '[DOCTOR_JOIN]%'`).
- Persist doctor-join photo to a Storage bucket instead of base64 in the message.
- Server-side wiring of `medicineSearchTerms.tokens` into product FTS query.
