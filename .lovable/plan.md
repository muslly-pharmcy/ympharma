## Phase 6.6 — Visitor Experience Activation

### 0. Fix the blocking build error first

`src/routes/doctors.$slug.tsx` and `src/routes/doctors.tsx` import from `src/modules/doctors/server/doctors.functions.ts`. The path segment `/server/` is blocked by TanStack Start's client-side import protection, so the build fails even though the file only exports `createServerFn` RPCs (which are client-safe).

Fix: move the file out of `/server/` (client-safe module path per project conventions) and update the two route imports.

- Move `src/modules/doctors/server/doctors.functions.ts` → `src/modules/doctors/api/doctors.functions.ts`
- Update imports in `src/routes/doctors.tsx` and `src/routes/doctors.$slug.tsx`
- Remove the now-empty `src/modules/doctors/server/` directory

No behavior change; server functions still run on the server via the RPC bridge.

### 1. Public homepage rebuild (`src/routes/index.tsx`)

Arabic-first, mobile-first, healthcare-focused landing page composed from lazy sections:

- `HeroHealthSearch` — RTL hero with a single search bar (uses the unified search component below), quick chips (أدوية / أطباء / محتوى صحي).
- `MainServices` — grid of core services (استشارة، حجز موعد، رفع روشتة، دليل الأدوية).
- `DoctorDiscoveryEntry` — teaser + CTA to `/doctors` (shows 3–4 featured doctors via existing `searchDoctorsPublic` limit=4).
- `MedicineDiscoveryEntry` — CTA to catalog/search (no new backend calls; static preview cards).
- `HealthEducationPreview` — 3 static cards → `/sahtak`.
- `LatestUpdates` — renders the new `WhatsNew` component.

All sections in `src/modules/visitor/components/`, code-split via `React.lazy` + `Suspense` where meaningful. Per-route `head()` metadata (Arabic title/description, og:*, twitter:card).

### 2. Unified public search — `src/modules/visitor/components/UnifiedSearch.tsx`

Client component with:
- Single input, RTL, Arabic normalization via existing `src/modules/doctors/domain/arabicNormalize.ts`.
- Category tabs: أدوية / أطباء / محتوى.
- Debounced query; doctors tab calls existing `searchDoctorsPublic`. Medicines + content tabs render "قريباً" placeholders (no schema changes).
- Keyboard + ARIA, mobile sheet on small screens.

### 3. "What's New" — `src/modules/visitor/components/WhatsNew.tsx`

Static, config-driven list from `src/modules/visitor/data/whats-new.ts` (title, date, href, tag). No DB. Renders as horizontal snap carousel on mobile, grid on desktop.

### 4. Visitor analytics foundation — `src/modules/visitor/analytics/`

- `track.ts` — anonymous event helper: `trackEvent(name, props?)`.
- Buffers events in `sessionStorage`, flushes on `visibilitychange` / `beforeunload` via `navigator.sendBeacon` to a *new* server route `src/routes/api/public/analytics/ingest.ts` (accepts POST, validates with Zod, and for now just logs — no DB writes, no PII, respects `sendBeacon`).
- Auto-track: `page_view`, `search_submitted`, `cta_clicked`. No cookies, no identifiers, hashed session-scoped id only.

### 5. Notification permission preparation — `src/modules/visitor/notifications/`

- `useNotificationNudge.ts` — after N meaningful engagements (e.g. 2 searches or 45s dwell) shows a soft in-page banner offering to enable notifications. Never calls `Notification.requestPermission()` automatically; only on explicit click. Stores dismissal in `localStorage`.
- `NotificationNudge.tsx` — dismissible RTL banner mounted on homepage.

### 6. Performance

- `React.lazy` for below-the-fold homepage sections (`MainServices`, `DoctorDiscoveryEntry`, `MedicineDiscoveryEntry`, `HealthEducationPreview`, `LatestUpdates`, `WhatsNew`, `NotificationNudge`).
- Preload LCP hero image via route `head().links` (`rel=preload`, `as=image`, `fetchpriority=high`) using an optimized asset in `src/assets/`.
- All `<img>` below the fold get `loading="lazy"` and `decoding="async"`.
- Audit the current index route for heavy top-level imports; move admin/pharmacy-only client bundles out of the public homepage import graph.

### 7. Report

`docs/engineering/reports/PHOENIX-P6.6-visitor-experience.md` with:
- Files changed (list)
- Build size delta (before/after `bun run build:dev`)
- Security verification (no new tables, no RLS/auth changes, analytics endpoint is anonymous + rate-note)
- Screenshots list (references to captures under `/tmp/browser/p6.6/`)

### Out of scope (per directive)

No migrations, no RLS, no auth, no changes to inventory/doctors/catalog domain logic.

### Files touched (summary)

- Move: `src/modules/doctors/server/doctors.functions.ts` → `src/modules/doctors/api/doctors.functions.ts` (+ update 2 route imports)
- New: `src/modules/visitor/**` (components, analytics, notifications, data)
- New: `src/routes/api/public/analytics/ingest.ts`
- Rewrite: `src/routes/index.tsx`
- New: `docs/engineering/reports/PHOENIX-P6.6-visitor-experience.md`
