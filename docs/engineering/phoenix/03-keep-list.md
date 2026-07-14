# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 3
## Files to KEEP (verbatim, no rewrite)
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14

These files are stable, load-bearing, and either auto-generated or already at target quality. Phoenix must NOT rewrite them. They may only be *moved* if explicitly noted.

---

## 1. Auto-generated — NEVER edit

- `src/routeTree.gen.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env` (VITE_SUPABASE_URL / _PUBLISHABLE_KEY / _PROJECT_ID)

## 2. Immutable history

- `supabase/migrations/**` — all 133 files. Additive-only from here.

## 3. Enterprise core (already at target)

- `src/core/idempotency/**`
- `src/core/dlq/**`
- `src/core/observability/**` (Logger, RequestContext, OtlpHttpExporter, withObservability)
- `src/core/ai-safety/**` (AISafetyGuard, InjectionDetector, PIIRedactor)
- `src/core/backup/**` (BackupVerificationService, BackupRestoreTest)
- `src/core/retention/**`

## 4. Security & guards (Phase 1/2 wins)

- `src/middleware/cron-auth.ts`
- `src/lib/cron-auth.server.ts`
- `scripts/check-imports.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/import-guard.yml`

## 5. Public webhook hooks (already hardened by CRON-P1-004)

All 32 files under `src/routes/api/public/hooks/**`. May be reorganized under `modules/api-gateway` later, but signature and auth stay bit-identical.

## 6. UI primitives worth preserving

- `src/components/ui/**` — shadcn primitives → move to `platform/ui-kit/primitives`.
- `src/components/titans/ui/**` (`Button`, `GlassCard`, `GoldenBorder`, `GradientText`) → `platform/ui-kit/titans`.
- `src/components/titans/motion/**` (`CursorFollower`, `ParticleBackground`, `Reveal`, `CountUp`) → `platform/ui-kit/motion`.
- `src/components/titans/sections/**` — Hero/Features/Pricing/Footer/Testimonials → `modules/cms/ui/marketing-sections`.
- `src/components/titans/NotificationBell.tsx` → `modules/notifications/ui`.
- `src/components/titans/ShareButtons.tsx` → `platform/ui-kit/social`.
- `src/components/Logo3D.tsx`, `src/components/nun-divider.tsx`, `src/components/page-transition.tsx` → `platform/ui-kit/brand`.
- `src/components/ErrorBoundary.tsx`, `src/components/InstallPrompt.tsx`, `src/components/sw-update-banner.tsx` → `platform/ui-kit/system`.

## 7. Domain UI worth preserving

- `src/components/product-card.tsx`, `src/components/product-gallery.tsx`, `src/components/conditions-strip.tsx`, `src/components/cart-recommendations.tsx` → `modules/catalog/ui`.
- `src/components/notifications-bell.tsx` → `modules/notifications/ui` (deduplicate with Titans variant).
- `src/components/admin/AdminGate.tsx` → `platform/tenant-context/guards`.
- `src/components/admin/InventoryAlerts.tsx` → `modules/inventory/ui`.

## 8. Governance & docs

- `docs/engineering/**` — all governance, plans, reports, artifacts.
- `docs/cto-final-verdict-2026-06-20.md`, `docs/titanus-audit-v17.md`, `docs/disaster-recovery.md`, `docs/security-operations.md`, `docs/phase-*.md`, etc.

## 9. Configs

- `vite.config.ts`, `tsconfig.json`, `package.json`, `bunfig.toml`, `eslint.config.js`, `playwright.config.ts`, `vitest.config.ts`, `components.json`, `.prettierrc`, `.prettierignore`.

## 10. Tests

- `src/__tests__/**` — all suites preserved; migrated in-place as their subjects move to modules.
- `scripts/test-*.sh` — inventory / event-bus loops.

## 11. PWA / static

- `public/**` — manifest, sw.js, robots.txt, offline.html, assetlinks.

## 12. Data

- **All Postgres data** — no destructive migration in Phoenix. Backups + verification cron unchanged.

---

**Summary counts:** ~140 files preserved verbatim (moved at most). Remainder is rebuild scope (see Deliverable 4).
