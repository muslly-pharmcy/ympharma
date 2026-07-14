# TITANUS OMEGA X — Phoenix Rebuild (Phase 1)

**Scope of this plan:** documentation and architecture only. No code, no migrations, no dependency changes. Deliverables are five reports/lists written under `docs/engineering/phoenix/`. Business data and stable runtime behavior are preserved untouched.

---

## Deliverable 1 — Architecture Audit Report
File: `docs/engineering/phoenix/01-audit.md`

Sections:
1. **Current architecture snapshot** — TanStack Start v1 + React 19 + Vite 7 on Cloudflare Workers; Supabase (Postgres + Auth + Storage); 478 files, 131 migrations, ~180 routes, 108 tables, 156 SECURITY DEFINER functions, 32 pg_cron jobs, 8 AI agents through `agent_events` + DLQ.
2. **Layer map** — client routes / server fns / `/api/public/*` hooks / RPCs / cron / event bus. Reuses diagram from `docs/cto-final-verdict-2026-06-20.md`.
3. **Technical debt register** — route sprawl (~90 `admin-*` top-level routes vs `_authenticated/`), duplicated admin dashboards, mixed Titans UI vs shadcn, inconsistent error taxonomy, no module boundaries, no tenant/organization abstraction, `pages`-style flat routing under `src/routes/` with domain concerns collapsed.
4. **Dependency analysis** — production vs dev, edge-incompatible risks, `xlsx` pin status (F-01 closed), overrides in `package.json`.
5. **Security audit** — carry-forward from Phase 1/2 closures (SEC-P1-002/003/004, CRON-P1-004, AUTH-P1-003, DB-P1-005). Gaps: no tenant isolation, no per-org RLS scoping, missing signed-webhook coverage on 3 external integrations, no bot detection layer.
6. **Performance audit** — bundle by route group, LCP on `/`, cold-start on Workers, N+1 candidates in admin dashboards, missing skeletons on 40+ routes.
7. **Database audit** — 108 tables classified by domain, orphan tables, missing FKs, RLS coverage matrix, GRANT correctness (post DB-P1-005), cron ownership map.
8. **Observability & DR** — Logger/Otlp/RequestContext core, backup verification cron (jobid=42), gaps vs enterprise SLO.

Method: read-only queries via `supabase--read_query`, `rg` inventories, and existing reports in `docs/engineering/reports/`. No schema changes.

---

## Deliverable 2 — Restructuring Plan (Target Architecture)
File: `docs/engineering/phoenix/02-restructure-plan.md`

**Target: modular monolith on TanStack Start**, module-per-domain, event bus as the seam, multi-tenant from day one.

Proposed layout:
```
src/
  modules/
    identity/         organizations/    branches/       users/
    roles/            permissions/      customers/      family/
    doctors/          appointments/     prescriptions/  prescription-ai/
    invoice-ai/       inventory/        warehouse/      transfers/
    suppliers/        marketplace/      orders/         payments/
    subscriptions/    insurance/        laboratories/   notifications/
    healthcare-media/ knowledge-base/   ai-engine/      analytics/
    marketing/        cms/              erp/            monitoring/
    audit/            security/         api-gateway/    administration/
  core/               (existing: idempotency, dlq, observability, ai-safety, backup, retention)
  platform/           (ui-kit, hooks, utils, tenant-context)
  routes/             (thin: import from modules; group under (public), (app), (admin), api/)
```

Each module owns: `domain/` (types + zod), `data/` (RPC + queries), `server/` (`.functions.ts`, `.server.ts`), `ui/` (components), `routes/` (re-exported by `src/routes/*` thin wrappers), `events/` (emit + consume), `README.md`.

Cross-cutting: multi-tenancy via `organization_id` on every domain table, `current_org()` RLS helper, `tenant-context` provider, per-org rate limits, per-org feature flags.

Module dependency graph (Deliverable 2 appendix): DAG with `core` and `platform` at the bottom; `identity → organizations → branches → users → roles/permissions`; domain modules depend only on lower layers and the event bus.

Reusable components report (Deliverable 2 appendix): inventory of shadcn primitives, Titans motion components, admin table/shell patterns, form patterns — with keep/merge/retire verdicts.

Migration strategy (Deliverable 2 appendix): strangler-fig, module by module; each module ships behind a feature flag; old routes redirect to new once parity is verified; DB migrations are additive-only during transition (add `organization_id` NULL → backfill → NOT NULL → RLS tighten).

---

## Deliverable 3 — Files to KEEP (verbatim)
File: `docs/engineering/phoenix/03-keep-list.md`

Categories (enumerated at report time):
- All `supabase/migrations/*` (immutable history).
- `src/core/**` (idempotency, dlq, observability, ai-safety, backup, retention).
- `src/integrations/supabase/**` (auto-generated).
- `src/middleware/cron-auth.ts`, `src/lib/cron-auth.server.ts`.
- `src/routes/api/public/hooks/**` (already hardened Batch by CRON-P1-004).
- `docs/engineering/**` (governance + reports + artifacts).
- `scripts/check-imports.ts`, `.github/workflows/**`.
- Titans UI primitives (`src/components/titans/ui/**`, `src/components/titans/motion/**`).
- Core UI kit (`src/components/ui/**` shadcn).
- Configs: `vite.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.js`, `playwright.config.ts`, `vitest.config.ts`, `supabase/config.toml`.
- Domain data: all Postgres data (no destructive migration in Phoenix).

---

## Deliverable 4 — Files to REBUILD
File: `docs/engineering/phoenix/04-rebuild-list.md`

Categories:
- Flat `src/routes/admin-*.tsx` (~90 files) → migrate under `src/routes/(admin)/<module>/*` with logic moved into `src/modules/<module>/`.
- Duplicated dashboards: `admin-hub`, `admin-command`, `admin-dashboard`, `admin-ai-executive*`, `admin-ai-orchestrator`, `admin-agents`, `admin-automation-hub` → consolidate to one `administration` module shell.
- Scattered AI routes (`admin-ai-*`, `ai-*`) → unified `ai-engine` + `prescription-ai` + `invoice-ai` modules.
- `src/lib/**` — split by module owner; retire generic bucket. Keep only truly cross-cutting utils in `src/platform/utils/`.
- `src/hooks/**` — same split.
- `src/components/admin/**` — decomposed into per-module `ui/`.
- `src/routes/__root.tsx` — rewrite with tenant provider, simplified head, split shell.
- Homepage (`src/routes/index.tsx`) and public routes — rebuilt against UX requirements (mobile-first, minimal steps).

Every entry lists: current path → target module → dependency notes → rebuild vs move-and-refactor.

---

## Deliverable 5 — Execution Phasing
File: `docs/engineering/phoenix/05-phases.md`

- **Phase 0 — Foundations (docs + guards, no runtime change).** This plan's five docs. Update `PROJECT_STATE.yaml` to open `PHOENIX-P0`. Add module boundary lint rule to `scripts/check-imports.ts` (dry-run only).
- **Phase 1 — Tenancy spine.** Add `organizations`, `organization_members`, `current_org()` RLS helper as additive migrations. No table rewrites. Backfill single default org for existing data.
- **Phase 2 — Platform layer.** Create `src/modules/` scaffolding + `src/platform/tenant-context`. Move `core/` untouched. Zero behavior change.
- **Phase 3 — Identity + Organizations + Branches + Users + Roles + Permissions.** First real module migrations.
- **Phase 4 — Catalog + Media Library (national medicine catalog, reusable product images).**
- **Phase 5 — Inventory + Warehouse + Transfers + Suppliers.**
- **Phase 6 — Customers + Family + Prescriptions + Prescription AI + Invoice AI.**
- **Phase 7 — Orders + Payments + Subscriptions + Insurance.**
- **Phase 8 — Doctors + Appointments + Laboratories.**
- **Phase 9 — Marketplace + Pharmacy Network (nationwide lookup, P2P exchange, near-expiry).**
- **Phase 10 — Notifications + Marketing + CMS + Healthcare Media + Knowledge Base.**
- **Phase 11 — Analytics + ERP + AI Engine consolidation.**
- **Phase 12 — Administration shell, Monitoring, Audit, Security, API Gateway hardening.**

Each phase: strangler-fig, feature-flagged, additive migrations, parity tests before old-route deletion. Every phase closes with a report under `docs/engineering/reports/PHOENIX-P<n>-*.md` and a `PROJECT_STATE.yaml` flip, matching the existing EES v4.0 governance.

---

## Governance touchpoints (this phase only)
- Append `PHOENIX-P0` to `docs/engineering/plans/phase-3.yaml` or open `plans/phase-4.yaml` (decide during writing).
- Update `docs/engineering/PROJECT_STATE.yaml` to `Phase3 or Phase4 / PHOENIX-P0 / EXECUTING` after approval.
- Append CHANGELOG entry.

## What this plan explicitly does NOT do
- No source code edits.
- No SQL, no migrations, no GRANT/REVOKE.
- No dependency install/removal.
- No route deletions or moves.
- No UI changes.

Approve to proceed with writing Deliverables 1–5.
