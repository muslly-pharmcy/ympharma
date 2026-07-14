# PHOENIX P6.5-A — Doctor Network Activation (Plan)

Zero DB changes. Reuses existing `hc_*` tables, RPCs, RLS, and modules from Phase 6.

## 1. Server layer (read-only)

`src/modules/doctors/server/doctors.functions.ts` — add:
- `searchDoctorsPublic({ q, specialty, city, area, facility, hasAvailability, page })` — `createServerFn` GET, no auth, filters on `hc_doctors` (`is_public=true`, `verification_status='verified'`) joined with `hc_doctor_specialties`, `hc_specialties`, `hc_doctor_locations`, `hc_locations`. Arabic normalization done in a shared helper (see §2).
- `getDoctorBySlug({ slug })` — public profile: doctor + specialties + locations + qualifications + next N availability blocks from `hc_doctor_availability`.
- `listFilterFacets()` — distinct specialties/cities/areas/facilities for filter UI.

`src/modules/healthcare-locations/server/locations.functions.ts` — add `listPublicCitiesAreas()` if not present.

All use publishable client via existing pattern; rely on existing RLS `public read verified` policies.

## 2. Arabic normalization

`src/modules/doctors/domain/arabicNormalize.ts` — pure TS:
- strip tashkeel, unify ي/ى, ه/ة, ا/أ/إ/آ, remove tatweel, collapse spaces
- regional variant map: `{ "المنصوره": "المنصورة", "باطنيه": "باطنية", ... }` (seed ~30 pairs, extendable)
- exported `normalizeAr(s)` used both client-side (instant filter) and server-side (query rewrite via ILIKE on normalized column OR `catalog_normalize_ar` SQL if reachable; fallback: fetch + client filter for wave-1 volume < 100).

## 3. Routes (public)

```
src/routes/doctors.tsx              → /doctors        directory + filters
src/routes/doctors.$slug.tsx        → /doctors/:slug  profile
src/routes/sahtak.tsx               → /sahtak         "صحتك" education shell (static sections placeholder)
```

Each route:
- SSR loader via `ensureQueryData` + `useSuspenseQuery`
- head() with unique Arabic title/description, og tags; profile route derives og:image from `doctor.photo_url`
- `errorComponent`, `notFoundComponent`
- mobile-first Tailwind, RTL, uses existing Titans `GlassCard`/`Button`
- link into admin hub for logged-in staff

## 4. Components

`src/modules/doctors/components/`
- `DoctorCard.tsx` — photo, name, specialty chips, city, trust badge, CTA
- `DoctorFilters.tsx` — search box, specialty/city/area/facility selects, "متاح اليوم" toggle; URL-synced via `validateSearch` + `zodValidator` + `fallback`
- `TrustBadge.tsx` — A/B/C/D pill (colors: emerald/blue/amber/slate) with tooltip explaining source
- `DoctorProfileHeader.tsx`, `ScheduleTable.tsx`, `AppointmentCTA.tsx` (placeholder button → toast "قريباً" + prefilled WhatsApp deep link when phone exists), `EmptyState.tsx`

Trust level derived from existing `verification_status` + `metadata.source_tier`:
- A = `verified` + tier `hospital|doctor`
- B = `verified` + tier `official`
- C = `pending` + tier `public`
- D = `pending` + no tier / needs review

## 5. Seed scaffold (no import execution)

```
healthcare/seed/
  README.md                      # column contract + import instructions
  aden-doctors-wave1.csv         # header row + 20 sample rows (categories listed)
  schema.ts                      # Zod schema for a seed row
```

CSV columns exactly as specified: `full_name, specialty, facility, city, area, phone, whatsapp, schedule, experience, verification_status, source, confidence_level`.

`scripts/import-doctors-seed.ts` — dry-run by default; maps CSV → `hc_doctors` + `hc_doctor_specialties` + `hc_doctor_locations` inserts via service-role (`.server.ts` guard). Requires `--commit` flag. NOT executed in this phase.

Seed content covers 7 categories × ~3 doctors each = 20 rows across Aden facilities.

## 6. Appointments — CTA only

Reuse `src/modules/appointments`. Only surface:
- schedule display from `hc_doctor_availability`
- CTA button rendered but disabled/placeholder (toast + WhatsApp fallback). No new booking logic.

## 7. "صحتك" education shell

`src/routes/sahtak.tsx` — three empty sections (articles / tips / doctor content) with placeholder cards. No CMS, no new tables. Ready for later CMS phase.

## 8. Nav integration

- Add "الأطباء" and "صحتك" links to public `SiteChrome` header.
- No admin changes required.

## 9. Verification

- `bunx tsgo` typecheck
- `bun run build`
- `supabase--linter` sanity
- Manual RLS check via `supabase--read_query` as anon-simulated select on `hc_doctors` where `is_public=true`
- Playwright mobile viewport screenshots: `/doctors`, `/doctors/:slug`, `/sahtak`

## 10. Report

`docs/engineering/reports/PHOENIX-P6.5-doctor-network.md` — files changed, DB objects reused (list), seed process, verification output, screenshot filenames. Phase marked CLOSED.

## Out of scope (explicit)

- No new tables, columns, enums, RLS, or RPCs.
- No real booking engine.
- No bulk import execution.
- No CMS for صحتك.

## Files touched (summary)

New:
- `src/modules/doctors/domain/arabicNormalize.ts`
- `src/modules/doctors/components/*` (6 files)
- `src/routes/doctors.tsx`, `src/routes/doctors.$slug.tsx`, `src/routes/sahtak.tsx`
- `healthcare/seed/README.md`, `aden-doctors-wave1.csv`, `schema.ts`
- `scripts/import-doctors-seed.ts`
- `docs/engineering/reports/PHOENIX-P6.5-doctor-network.md`

Edited:
- `src/modules/doctors/server/doctors.functions.ts` (add public fns)
- `src/modules/doctors/index.ts` (exports)
- `src/components/site-chrome.tsx` (nav links)
