# PHOENIX P6.5-A — Doctor Network Activation

Status: **CLOSED**
Date: 2026-07-14

## Objective

Activate the existing Phase 6 Doctor Foundation (`hc_*` tables/RPCs) into a public,
user-facing Arabic-first healthcare directory — with zero database changes.

## Deliverables

### 1. Public server functions (`src/modules/doctors/server/doctors.functions.ts`)
- `searchDoctorsPublic({ q, specialty, city, facility, page })` — filters `hc_doctors`
  joined with specialties + locations. Returns shaped, serializable rows with
  computed `trust_level` (A–D). Arabic normalization done in-memory.
- `getDoctorBySlugPublic({ slug })` — full profile (bio, specialties, locations,
  availability, qualifications). Metadata reduced to `trust_level` before return
  to satisfy TanStack Start's SSR-serializable-return contract.
- `listPublicFacets()` — active specialties, distinct cities/facilities.

### 2. Arabic normalization (`src/modules/doctors/domain/arabicNormalize.ts`)
Pure/isomorphic: strips tashkeel/tatweel, unifies hamza/alef/yaa/haa forms,
regional variant map (~30 Yemeni pairs), `matchesAr()` for case-insensitive
partial matches.

### 3. Routes
- `src/routes/doctors.tsx` → `/doctors` — directory with URL-synced filters
  (validateSearch + z.catch defaults), suspense query + facets, pagination.
- `src/routes/doctors.$slug.tsx` → `/doctors/:slug` — profile page with schedule,
  qualifications, trust badge, appointment CTA. og:image derived from `photo_url`.
- `src/routes/sahtak.tsx` → `/sahtak` — "صحتك" education shell (3 placeholder
  sections; no CMS wiring in this phase).

### 4. Components (`src/modules/doctors/components/`)
- `DoctorCard`, `DoctorFilters`, `TrustBadge`, `ScheduleTable`, `AppointmentCTA`,
  `EmptyState` — mobile-first, RTL, tailwind, uses existing design tokens.

### 5. Trust system (A–D)
Computed server-side from `verification_status` + `metadata.source_tier`:
- **A** — verified + `hospital`/`doctor`
- **B** — verified + `official` (or default verified)
- **C** — pending + `public`
- **D** — pending + no tier

### 6. Appointment preparation
CTA rendered on profile page. Button triggers "coming soon" toast; WhatsApp/Phone
fallbacks provided when contact info exists. No booking logic added — reuses
existing `src/modules/appointments`.

### 7. Seed scaffold (`healthcare/seed/`)
- `README.md` — column contract + import instructions
- `schema.ts` — Zod schema for a seed row
- `aden-doctors-wave1.csv` — 20 doctors across 7 categories (باطنية, نساء وتوليد,
  أطفال, جلدية, عظام, قلبية, أسنان + مسالك, أعصاب, عيون, أنف وأذن, جراحة, غدد)
- `scripts/import-doctors-seed.ts` — dry-run by default, requires `--commit`
  and service-role env vars. **Not executed in this phase.**

### 8. Navigation
- Added "🩺 الأطباء" and "💚 صحتك" links to `SiteHeader` (desktop nav + mobile
  footer menu).

## Database objects reused (no changes)
- Tables: `hc_doctors`, `hc_specialties`, `hc_doctor_specialties`, `hc_locations`,
  `hc_doctor_locations`, `hc_doctor_availability`, `hc_doctor_qualifications`.
- RLS: existing "public read verified" policies remain the gate.

## Out of scope (explicit)
- No new tables, columns, enums, RLS, or RPCs.
- No real booking engine.
- No CMS for صحتك.
- Seed importer scaffolded but not run.

## Verification
- Typecheck: passing (fixed `perPage` const-narrowing and jsonb serialization
  issues in the server-fn return type).
- Routes render: `/doctors`, `/doctors/:slug` (404 when slug missing), `/sahtak`.
- Nav links visible in header on desktop + mobile menu.

## Files changed

New:
- `src/modules/doctors/domain/arabicNormalize.ts`
- `src/modules/doctors/components/DoctorCard.tsx`
- `src/modules/doctors/components/DoctorFilters.tsx`
- `src/modules/doctors/components/TrustBadge.tsx`
- `src/modules/doctors/components/ScheduleTable.tsx`
- `src/modules/doctors/components/AppointmentCTA.tsx`
- `src/modules/doctors/components/EmptyState.tsx`
- `src/routes/doctors.tsx`
- `src/routes/doctors.$slug.tsx`
- `src/routes/sahtak.tsx`
- `healthcare/seed/README.md`
- `healthcare/seed/schema.ts`
- `healthcare/seed/aden-doctors-wave1.csv`
- `scripts/import-doctors-seed.ts`
- `docs/engineering/reports/PHOENIX-P6.5-doctor-network.md`

Edited:
- `src/modules/doctors/server/doctors.functions.ts`
- `src/modules/doctors/index.ts`
- `src/components/site-chrome.tsx`
