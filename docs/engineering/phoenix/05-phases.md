# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 5
## Execution Phasing
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14

Every phase is strangler-fig, additive-only, feature-flagged. Every phase closes with a report under `docs/engineering/reports/PHOENIX-P<n>-*.md`, a `PROJECT_STATE.yaml` flip, and a `CHANGELOG.md` entry — matching existing EES v4.0 governance.

---

### Phase 0 — Foundations (docs + guards)
- Deliverables 1–5 committed under `docs/engineering/phoenix/`.
- Extend `scripts/check-imports.ts` with module-boundary lint (dry-run: warn, don't fail).
- Open `plans/phase-4.yaml` with the Phoenix track.
- Exit criteria: docs merged; boundary lint reports 0 errors on empty ruleset.

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
- Add `medicine_catalog_master`, `medicine_aliases` (national catalog spec: commercial/generic names, strength, dosage form, package size, barcode, manufacturer, country, category, aliases, common misspellings, AR/EN names).
- Add `product_media` normalized on top of existing `product_gallery_images` / `product_image_overrides` (via view first).
- `catalog` + `media-library` modules ship; old `admin-products` / `admin-product-gallery` proxy to new UI behind flag.

### Phase 5 — Inventory + Warehouse + Transfers + Suppliers
- Introduce `inventory_reservations` (closes Gap G1 from CTO verdict).
- Reserve/release RPCs; wire into orders flow behind flag.

### Phase 6 — Customers + Family + Prescriptions + Prescription AI + Invoice AI
- New `family_groups`, `family_members`.
- Unified prescription intake route (mobile-first, ≤3 taps).
- `prescription-ai` + `invoice-ai` modules consume from `ai-engine`.

### Phase 7 — Orders + Payments + Subscriptions + Insurance
- Consolidate order status timeline; add per-org `payment_providers` config.
- `subscriptions` module (recurring refills).
- Insurance claims lifecycle formalized.

### Phase 8 — Doctors + Appointments + Laboratories (greenfield)
- New tables + RLS scoped by org.
- e-prescription QR + doctor calendar + voice prescription (behind `ai-engine`).
- Lab orders + results flow.

### Phase 9 — Marketplace + Pharmacy Network
- `pharmacy_network_links` (opt-in inter-pharmacy sharing).
- Nationwide medicine availability lookup RPC.
- P2P transfer request flow.
- Near-expiry inventory dashboard.

### Phase 10 — Notifications + Marketing + CMS + Healthcare Media + Knowledge Base
- Unified notifications dispatch (email + WhatsApp + Slack + in-app).
- Marketing automation module wraps existing campaigns/banners/offers/discounts.
- CMS module owns public marketing pages + healthcare media library + knowledge base.

### Phase 11 — Analytics + ERP + AI Engine consolidation
- One reporting surface, one exec dashboard.
- Retire duplicated dashboards.
- Consolidate all AI calls behind `ai-engine` — no direct gateway calls elsewhere.

### Phase 12 — Administration shell + Monitoring + Audit + Security + API Gateway
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
| 6 | 2 sprints |
| 7 | 2 sprints |
| 8 | 3 sprints (greenfield) |
| 9 | 2 sprints |
| 10 | 2 sprints |
| 11 | 1 sprint |
| 12 | 2 sprints |
