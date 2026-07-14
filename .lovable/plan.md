# Phoenix Architecture Additions — Docs-Only Update

Scope: update three Phoenix deliverables under `docs/engineering/phoenix/` to register four new modules and reorder Doctor Foundation. No source, migrations, dependencies, or `PROJECT_STATE.yaml` changes.

## Files to update

### 1. `01-audit.md`
Append an "Architecture Additions (2026-07-14)" section noting four capability gaps the audit under-scoped, which the additions below close:
- Commerce / SaaS revenue surface fragmented across orders, subscriptions, payments, insurance.
- Notification dispatch scattered (Slack, WhatsApp, email, in-app) with no unified engine or user preferences.
- Product intelligence (OCR, barcode, image recognition, AR/EN aliases, misspellings, expiry) lives inside prescription-ai / catalog with no shared brain.
- Growth (referrals, loyalty, coupons, campaigns, social) spread across marketing/loyalty/campaigns routes with no cohesive engine.

### 2. `02-restructure-plan.md`
- In the `src/modules/` directory layout, add four modules and mark the merges they consolidate:
  - `commerce-core/` — owns subscriptions, billing, payments, commissions, SaaS plans, revenue tracking. Absorbs the commerce parts of `payments`, `subscriptions`, `insurance` (claims stay in `insurance`).
  - `notification-engine/` — owns push, WhatsApp, SMS, email, in-app, campaigns automation, user preferences. Replaces standalone `notifications` module; `marketing` delegates dispatch to it.
  - `product-intelligence/` — owns catalog intelligence, OCR matching, barcode, image recognition, AR/EN aliases, misspelling correction, expiry intelligence. Sits between `catalog` and `prescription-ai` / `invoice-ai`; the AI modules consume it.
  - `growth-engine/` — owns referrals, loyalty, coupons, campaigns, customer engagement, social automation. Absorbs `marketing` growth surface (CMS content stays in `cms`).
- Update the module dependency DAG:
  - `commerce-core` sits above `orders`, feeds `analytics` and `erp`; consumes `identity`, `organizations`.
  - `notification-engine` replaces `notifications` node; every module dispatches through it.
  - `product-intelligence` sits between `catalog` + `media-library` (below) and `prescription-ai` + `invoice-ai` (above).
  - `growth-engine` sits alongside `marketing`, above `customers` and `orders`, below `analytics`.
- Update the reusable-components table: route `alert-dispatch.server.ts`, `slack.functions.ts`, existing loyalty/campaigns/banners UIs into the new modules as adapters (KEEP, relocate).
- Update Cross-cutting layers: Notifications bullet now points to `notification-engine`; add a Commerce bullet (single revenue ledger) and a Product Intelligence bullet (shared OCR/vision/alias service consumed by AI modules).

### 3. `05-phases.md`
Reorder and rename phases 5–11 to insert Doctor Foundation earlier and land the four new modules on the right layer. New order:

```text
Phase 0  Foundations (docs + guards)               [done]
Phase 1  Tenancy spine                              [unchanged]
Phase 2  Platform layer                             [unchanged]
Phase 3  Identity/Orgs/Branches/Users/Roles/Perms   [unchanged]
Phase 4  Catalog + Media Library                    [unchanged]
Phase 5  Inventory + Warehouse + Transfers + Suppliers [unchanged]
Phase 6  Doctor Foundation (NEW, moved earlier)
         - doctor profiles, specialties, locations,
           availability, appointment foundation
         - no advanced prescription AI yet
Phase 7  Product Intelligence (NEW)
         - OCR, barcode, image recognition,
           AR/EN aliases, misspellings, expiry engine
Phase 8  Customers + Family + Prescriptions + Prescription AI + Invoice AI
         - consumes product-intelligence
Phase 9  Commerce Core (NEW)
         - subscriptions, billing, payments,
           commissions, SaaS plans, revenue ledger
         - absorbs current Orders/Payments/Subscriptions/Insurance work
Phase 10 Orders (thin) + Insurance claims
Phase 11 Appointments + Laboratories (advanced)
         - builds on Phase 6 doctor foundation;
           adds e-prescription QR, voice prescription,
           lab orders/results
Phase 12 Marketplace + Pharmacy Network
Phase 13 Notification Engine (NEW)
         - unified push/WhatsApp/SMS/email/in-app,
           campaigns automation, user preferences
Phase 14 Growth Engine (NEW)
         - referrals, loyalty, coupons, campaigns,
           social automation
Phase 15 CMS + Healthcare Media + Knowledge Base
Phase 16 Analytics + ERP + AI Engine consolidation
Phase 17 Administration shell + Monitoring + Audit + Security + API Gateway
         - enforce organization_id NOT NULL, tighten RLS,
           retire legacy admin routes
```

Keep per-phase mandatory checks, rollback contract, and additive-only rule unchanged. Refresh the indicative-timeline table to match the new numbering (no committed dates).

### 4. `README.md` (Phoenix index)
One-line update: note the 2026-07-14 architecture additions (4 new modules + Doctor Foundation reorder) and that phase count is now 17.

## Out of scope
- `PROJECT_STATE.yaml`, `CHANGELOG.md` — untouched (per contract, CTO flips state).
- `03-keep-list.md`, `04-rebuild-list.md` — no re-classification needed; module relocations already covered by rebuild-list categories.
- Any source, SQL, or dependency change.

## Deliverable
Four edited docs. Reply summarizes the additions and confirms Phase 1 is still gated on your explicit go.
