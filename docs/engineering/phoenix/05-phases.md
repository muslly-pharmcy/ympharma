# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 5
## Execution Phasing
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14 (revised — 4 new modules + Doctor Foundation reorder)

Every phase is strangler-fig, additive-only, feature-flagged. Every phase closes with a report under `docs/engineering/reports/PHOENIX-P<n>-*.md`, a `PROJECT_STATE.yaml` flip, and a `CHANGELOG.md` entry — matching existing EES v4.0 governance.

---

### Phase 0 — Foundations (docs + guards) — DONE
- Deliverables 1–5 committed under `docs/engineering/phoenix/`.
- Extend `scripts/check-imports.ts` with module-boundary lint (dry-run: warn, don't fail).
- Open `plans/phase-4.yaml` with the Phoenix track.
- Exit: docs merged; boundary lint reports 0 errors on empty ruleset.

### Phase 1 — Tenancy spine (additive DB)
- Migrations: `organizations`, `organization_members`, `current_org()`, default-org backfill helper.
- No changes to existing tables. No RLS changes.
- Exit: `current_org()` returns default org for every existing session.

### Phase 2 — Platform layer
- Scaffold `src/modules/` + `src/platform/`.
- Create `platform/tenant-context` provider + hooks.
- Create `platform/feature-flags` (reads `app_settings`).
- Zero runtime behavior change; imports untouched.
- Exit: `bunx tsgo --noEmit` PASS, build PASS, all Playwright tests green.

### Phase 3 — Identity, Organizations, Branches, Users, Roles, Permissions
- Move `AdminGate`, `use-session`, `user_roles` server fns into modules.
- Additive `organization_id` on `user_roles`, `staff_permissions`, `branches`, `branch_user_assignments`, `user_devices`; backfill; **do not** enforce NOT NULL yet.
- New administration shell skeleton behind `phoenix.administration=off`.

### Phase 4 — Catalog + Media Library
- Add `medicine_catalog_master`, `medicine_aliases` (commercial/generic names, strength, dosage form, package size, barcode, manufacturer, country, category, aliases, common misspellings, AR/EN names).
- Add `product_media` normalized on top of existing `product_gallery_images` / `product_image_overrides` (via view first).
- `catalog` + `media-library` modules ship; old `admin-products` / `admin-product-gallery` proxy to new UI behind flag.

### Phase 5 — Inventory + Warehouse + Transfers + Suppliers
- Introduce `inventory_reservations` (closes Gap G1 from CTO verdict).
- Reserve/release RPCs; wire into orders flow behind flag.

### Phase 6 — Doctor Foundation (NEW — moved earlier)
- New tables: `doctors`, `doctor_specialties`, `doctor_locations`, `doctor_availability`, `appointments` (foundation only).
- Doctor onboarding + profile management UI, per-org RLS.
- Appointment foundation: booking data model, calendar primitives — no voice, no advanced clinical AI yet.
- Exit: doctors can be created, listed, and booked at a minimum viable level behind `phoenix.doctors=off`.

### Phase 7 — Product Intelligence (NEW)
- New `modules/product-intelligence` consolidates OCR, barcode, image recognition, AR/EN aliases, misspelling correction, expiry engine.
- Shared server fns + registry consumed by later AI modules.
- No end-user UX change; internal service ready to be called by Phase 8.

### Phase 8 — Customers + Family + Prescriptions + Prescription AI + Invoice AI
- New `family_groups`, `family_members`.
- Unified prescription intake route (mobile-first, ≤3 taps).
- `prescription-ai` + `invoice-ai` modules consume `ai-engine` **and** `product-intelligence` (from Phase 7).

### Phase 9 — Commerce Core (NEW)
- New `modules/commerce-core`: subscriptions, billing, payments, commissions, SaaS plans, revenue ledger.
- Consolidates money movement previously scattered across `orders`, `payments`, `subscriptions`, `insurance`.
- Additive ledger tables; dual-write from legacy fns behind flag.
- Exit: single revenue ledger reconciles with legacy per-table totals for 7 days.

### Phase 10 — Orders (thin) + Insurance claims
- `orders` slimmed to status/timeline; money posts to `commerce-core`.
- `insurance` keeps claims lifecycle only; settlement flows through `commerce-core`.
- Per-org `payment_providers` config.

### Phase 11 — Appointments + Laboratories (advanced)
- Builds on Phase 6 doctor foundation.
- Adds e-prescription QR, doctor calendar UX, voice prescription (via `ai-engine` + `product-intelligence`).
- Lab orders + results flow.

### Phase 12 — Marketplace + Pharmacy Network
- `pharmacy_network_links` (opt-in inter-pharmacy sharing).
- Nationwide medicine availability lookup RPC (uses `product-intelligence` aliases).
- P2P transfer request flow.
- Near-expiry inventory dashboard.

### Phase 13 — Notification Engine (NEW)
- New `modules/notification-engine`: push, WhatsApp, SMS, email, in-app, campaign automation, per-user channel preferences.
- Existing dispatchers (`alert-dispatch.server.ts`, `slack.functions.ts`, WhatsApp/email routes) refactored into adapters.
- All modules switch dispatch calls to the engine behind flag.

### Phase 14 — Growth Engine (NEW)
- New `modules/growth-engine`: referrals, loyalty, coupons, campaigns, engagement, social automation.
- Absorbs existing `loyalty`, `campaigns`, `banners`, `offers`, `discounts` surfaces.
- Dispatches through `notification-engine`; measured by `analytics`.

### Phase 15 — CMS + Healthcare Media + Knowledge Base
- CMS module owns public marketing pages + healthcare media library + knowledge base.
- Marketing content separated from growth mechanics (owned by Phase 14).

### Phase 16 — Analytics + ERP + AI Engine consolidation
- One reporting surface, one exec dashboard.
- Retire duplicated dashboards.
- Consolidate all AI calls behind `ai-engine` — no direct Lovable AI Gateway calls elsewhere.

### Phase 17 — Administration shell + Monitoring + Audit + Security + API Gateway
- Single `/admin` shell with left-nav grouped by module.
- API gateway centralizes HMAC/rate-limit for all `/api/public/*`.
- SLO dashboard, per-org rate limits, bot detection layer.
- Enforce `organization_id NOT NULL` on all domain tables and tighten RLS to `current_org()`.
- Retire all legacy admin routes; delete `src/components/admin/**` monolith remnants.

---

## Per-phase mandatory checks

For every phase Nn:
- Additive migrations only; no drops, no renames (views for shape changes).
- `bunx tsgo --noEmit` PASS.
- Build PASS on Cloudflare Workers profile.
- Playwright parity suite PASS vs baseline.
- Zero import-guard violations.
- New tables carry: GRANTs, RLS enabled, `organization_id` (once Phase 1 lands).
- CHANGELOG entry + report file + `PROJECT_STATE.yaml` flip.
- Feature flag defaults OFF; enabled per-org after parity gate.

## Rollback contract

Every phase must be revertible by flipping its feature flag OFF without a DB rollback. Migrations are additive; new tables/columns can stay unused.

## Timeline (indicative, not committed)

| Phase | Effort |
|---:|---|
| 0 | done (this doc set) |
| 1–2 | 1 sprint |
| 3 | 1 sprint |
| 4 | 2 sprints |
| 5 | 2 sprints |
| 6 | 2 sprints (Doctor Foundation — new) |
| 7 | 1 sprint (Product Intelligence — new) |
| 8 | 2 sprints |
| 9 | 2 sprints (Commerce Core — new) |
| 10 | 1 sprint |
| 11 | 3 sprints (greenfield appointments + labs) |
| 12 | 2 sprints |
| 13 | 2 sprints (Notification Engine — new) |
| 14 | 2 sprints (Growth Engine — new) |
| 15 | 1 sprint |
| 16 | 1 sprint |
| 17 | 2 sprints |
