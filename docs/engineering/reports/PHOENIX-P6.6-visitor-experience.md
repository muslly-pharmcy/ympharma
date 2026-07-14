# PHOENIX P6.6 — Visitor Experience Activation

Status: CLOSED
Date: 2026-07-14
Scope: public site visitor experience only. No DB migrations. No RLS/auth changes. No touches to inventory/doctors/catalog domain logic.

## Summary

Activated the public visitor experience on top of the existing Phoenix backend:

- Fixed the blocking `import-protection` build failure by relocating public doctor server functions out of `/server/`.
- Added a unified public search (medicines, doctors, health content) with Arabic normalization on top of the homepage.
- Added a Doctor Discovery entry, Health Education preview, and What's New sections on the public homepage.
- Introduced an anonymous visitor analytics foundation (no PII, no cookies) with a public ingest route.
- Added a soft notification-permission nudge that never auto-prompts.
- Lazy-loaded all new below-the-fold sections and the nudge to keep the homepage bundle lean.

## Files Changed

Moved:
- `src/modules/doctors/server/doctors.functions.ts` → `src/modules/doctors/api/doctors.functions.ts` (path segment `/server/**` is blocked by TanStack Start's client import protection).

Import path fixes (no behavior change):
- `src/routes/doctors.tsx`
- `src/routes/doctors.$slug.tsx`
- `src/modules/doctors/components/DoctorCard.tsx`
- `src/modules/doctors/index.ts`

New — visitor module:
- `src/modules/visitor/analytics/track.ts`
- `src/modules/visitor/analytics/useVisitorAnalytics.ts`
- `src/modules/visitor/components/UnifiedSearch.tsx`
- `src/modules/visitor/components/DoctorDiscoveryEntry.tsx`
- `src/modules/visitor/components/HealthEducationPreview.tsx`
- `src/modules/visitor/components/WhatsNew.tsx`
- `src/modules/visitor/components/NotificationNudge.tsx`
- `src/modules/visitor/notifications/useNotificationNudge.ts`
- `src/modules/visitor/data/whats-new.ts`

New — public API:
- `src/routes/api/public/analytics/ingest.ts` (POST-only, Zod-validated, 20 KB payload cap, no DB writes)

Modified:
- `src/routes/index.tsx` — imports visitor module, calls `useVisitorAnalytics()`, inserts `UnifiedSearch` under the hero logo, lazy-loads `DoctorDiscoveryEntry`, `HealthEducationPreview`, `WhatsNew`, and `NotificationNudge`.

## Feature Notes

### 1. Unified public search
- Single input + category tabs: `أدوية / أطباء / محتوى صحي`.
- Arabic normalization via existing `@/modules/doctors/domain/arabicNormalize#normalizeAr` (strips tashkeel/tatweel, unifies alef/yaa/haa forms, expands common Yemeni variants).
- Medicines → `/products?q=...`; Doctors → `/doctors?q=...` (with the full search schema); Content → `/sahtak`.
- RTL, semantic `role="search"` + `role="tablist"`, `aria-selected` on tabs, `sr-only` label on input.

### 2. Homepage sections (rebuild)
Existing healthcare-oriented sections are preserved. New sections added:
- `UnifiedSearch` — hero-level health search.
- `DoctorDiscoveryEntry` — CTA into `/doctors` with trust-system explainer.
- `HealthEducationPreview` — 3 preview cards linking `/sahtak`.
- `WhatsNew` — mobile snap-carousel, desktop grid, driven by `src/modules/visitor/data/whats-new.ts`.

All four sections are code-split via `React.lazy` + `Suspense`.

### 3. What's New
Static config-driven list (no DB). Editorial team updates `src/modules/visitor/data/whats-new.ts`.

### 4. Visitor analytics foundation
- Anonymous session id in `sessionStorage` only (no cookies, no cross-session id).
- Events buffered in `sessionStorage` (cap 20).
- Flush via `navigator.sendBeacon` on `visibilitychange:hidden` / `pagehide`, `fetch` `keepalive` fallback.
- Endpoint: `POST /api/public/analytics/ingest` — Zod-validated, 20 KB body cap, 204 No Content on success. No database writes; server-side log line only. Ready to be swapped for DB persistence in a future phase behind an anon-safe policy.
- Auto-tracked events: `page_view`, `search_submitted`, `search_category_changed`, `cta_clicked` (WhatsNew, DoctorDiscoveryEntry, HealthEducationPreview), plus notification lifecycle events.

### 5. Notification permission preparation
- `useNotificationNudge` waits at least 20 s AND at least 2 engagement signals before rendering the banner.
- Never calls `Notification.requestPermission()` automatically; only from an explicit user click on "تفعيل الإشعارات".
- Dismissal is persisted in `localStorage` (`vx.notif.dismissed.v1`) and respected on future visits.
- Skipped entirely if the browser doesn't expose `Notification` or if permission is already `granted`/`denied`.

### 6. Performance
- Below-the-fold homepage sections (`DoctorDiscoveryEntry`, `HealthEducationPreview`, `WhatsNew`, `NotificationNudge`) code-split via `React.lazy` — the initial homepage chunk does not pay their cost.
- Existing hero LCP preload preserved (`storefrontUrl` with `fetchPriority="high"`).
- Existing eager/lazy image split retained; no new eager images introduced.
- Analytics uses `sendBeacon` on unload — no blocking network on navigation.

### Build results
`bun run build:dev` completed successfully (`✓ built in 2.45s`, nitro output generated). No new dependencies were added.

## Security verification

- No database migrations, no RLS changes, no auth changes.
- New public endpoint `POST /api/public/analytics/ingest`: input validated with Zod, hard 20 KB payload cap, `events.length` capped at 50, returns 204 on success and 400 on invalid input. No PII collected (only path, event name, timestamp, anonymous session id, small typed props map). No DB writes — impact of misuse is bounded to log noise.
- No new secrets referenced.
- Notification permission is never auto-requested; user gesture required.
- No changes to `SECURITY DEFINER` functions, GRANTs, or policies.
- Import protection: relocating `doctors.functions.ts` out of `/server/**` restores the client-safe boundary; the file continues to expose only `createServerFn`-based RPCs (handler bodies stripped from client bundles as before).

## Screenshots (suggested)

Capture from a preview viewport of 390×844 (mobile) and 1280×800 (desktop):
- `/tmp/browser/p6.6/01-home-hero-mobile.png` — hero + unified search on mobile.
- `/tmp/browser/p6.6/02-home-hero-desktop.png` — hero + unified search on desktop.
- `/tmp/browser/p6.6/03-doctor-discovery.png` — Doctor Discovery entry.
- `/tmp/browser/p6.6/04-sahtak-preview.png` — Health Education preview cards.
- `/tmp/browser/p6.6/05-whats-new-mobile.png` — What's New snap-carousel on mobile.
- `/tmp/browser/p6.6/06-notification-nudge.png` — Notification nudge after threshold reached.

## Follow-ups (out of scope for P6.6)

- Persist analytics events to a dedicated `visitor_events` table behind narrow `TO anon` INSERT + rate-limit (would require a migration — Phase 6.7).
- Wire medicines/content tabs of `UnifiedSearch` to real catalog and Sahtak content search once those modules expose public list endpoints.
- Replace static `whats-new.ts` with a lightweight editorial table + read-only policy.
