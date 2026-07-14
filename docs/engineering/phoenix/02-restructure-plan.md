# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 2
## Restructuring Plan (Target Architecture)
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14

---

## 1. Target style

**Modular monolith** on TanStack Start, deployed to Cloudflare Workers, backed by Supabase. Domain modules communicate through the existing event bus (`agent_events`) and typed server functions. Multi-tenant from day one.

Principles applied: Mobile-First · Performance-First · Security-First · Simplicity-First · Accessibility-First · Offline-Ready · AI-Native · API-First · Event-Driven · Zero-Trust.

---

## 2. Directory layout

```text
src/
  core/                        # kept as-is (idempotency, dlq, observability, ai-safety, backup, retention)
  platform/                    # cross-cutting foundations
    tenant-context/            # current-org provider + hooks
    ui-kit/                    # shared shadcn primitives + Titans motion
    hooks/                     # truly cross-cutting only
    utils/
    feature-flags/
    api-client/                # typed server-fn wrappers
  modules/
    identity/
    organizations/
    branches/
    users/
    roles/
    permissions/
    customers/
    family/
    doctors/
    appointments/
    prescriptions/
    prescription-ai/
    invoice-ai/
    catalog/                   # national medicine catalog master
    product-intelligence/      # NEW — OCR, barcode, image recognition, AR/EN aliases, misspellings, expiry engine (consumed by prescription-ai, invoice-ai, marketplace, pharmacy-network)
    media-library/             # centralized reusable product images
    inventory/
    warehouse/
    transfers/
    suppliers/
    marketplace/
    pharmacy-network/          # inter-pharmacy lookup + P2P exchange + near-expiry
    orders/                    # thin — status/timeline only; money moves through commerce-core
    commerce-core/             # NEW — subscriptions, billing, payments, commissions, SaaS plans, revenue ledger (absorbs commerce parts of payments/subscriptions; insurance keeps claims)
    payments/                  # adapter layer; providers only — settlement recorded in commerce-core
    subscriptions/             # adapter — recurring refill rules; billing in commerce-core
    insurance/                 # claims lifecycle only
    laboratories/
    notification-engine/       # NEW — push, WhatsApp, SMS, email, in-app, campaign automation, user preferences (replaces standalone notifications module)
    healthcare-media/
    knowledge-base/
    ai-engine/                 # unified prompts, guardrails, tool registry
    growth-engine/             # NEW — referrals, loyalty, coupons, campaigns, customer engagement, social automation (absorbs marketing growth surface)
    analytics/
    marketing/                 # thin — delegates dispatch to notification-engine and growth-engine
    cms/                       # marketing pages content only
    erp/
    monitoring/
    audit/
    security/
    api-gateway/
    administration/            # unified admin shell (replaces admin-hub/command/dashboard)

  routes/                      # thin: route files re-export from modules
    (public)/                  # marketing, catalog browsing, prescription upload
    (app)/                     # customer / doctor / pharmacist authenticated shells
    (admin)/                   # administration shell
    api/                       # server routes (webhooks, cron)
  integrations/supabase/       # auto-generated — untouched
  middleware/                  # cron-auth etc — untouched
```

### Module internal shape (mandatory)

```text
modules/<name>/
  domain/          # types.ts, schema.ts (zod), errors.ts
  data/            # queries.ts (react-query options), rpc.ts
  server/          # <name>.functions.ts, <name>.server.ts
  events/          # emit.ts, consume.ts (agent_events)
  ui/              # components + panels
  routes/          # route components; imported by src/routes/*
  README.md        # ownership, invariants, events emitted/consumed
```

---

## 3. Multi-tenancy contract

- New root tables: `organizations`, `organization_members(org_id, user_id, role)`.
- New SQL helper: `public.current_org() RETURNS uuid` — reads from JWT claim `org_id`.
- Every domain table gains `organization_id uuid NOT NULL REFERENCES organizations(id)` in an additive migration (see migration strategy §7).
- RLS pattern:
  ```sql
  USING (organization_id = public.current_org())
  WITH CHECK (organization_id = public.current_org())
  ```
- `platform/tenant-context` React provider hydrates `org_id` from session and injects into all queries.
- Per-org rate-limit key: `bucket_key = concat(org_id, ':', purpose, ':', subject)`.

---

## 4. Module dependency graph (DAG)

```text
                     ┌── core ───┐
                     │           │
                     ▼           ▼
                platform ── ui-kit
                     │
     ┌───────────────┼──────────────────────────────┐
     ▼               ▼                              ▼
identity      organizations                    audit / security / monitoring
     │               │
     └──► users ─► roles ─► permissions
                             │
                             ▼
              ┌── branches ── customers ── family ── doctors ── appointments
              │        │           │
              ▼        ▼           ▼
          catalog  inventory     (see prescriptions branch below)
              │        │
              ▼        ▼
        media-lib  warehouse
              │        │
              ▼        ▼
     product-intelligence (OCR / barcode / vision / aliases / expiry)
              │
              ├──► prescriptions ──► prescription-ai
              │                          │
              │                          ▼
              │                      invoice-ai
              │
              ▼
         transfers ── suppliers ── marketplace ── pharmacy-network
                                                     │
                              ┌──────────────────────┘
                              ▼
                          orders ──► commerce-core ──► payments · subscriptions · insurance-claims · laboratories
                              │             │
                              │             └──► analytics · erp
                              ▼
                      growth-engine  (referrals · loyalty · coupons · campaigns · social)
                              │
                              ▼
                  notification-engine  (push · WhatsApp · SMS · email · in-app · preferences)
                              │
                              ▼
                 cms · healthcare-media · knowledge-base
                              │
                              ▼
                     analytics ── erp ── ai-engine ── administration ── api-gateway
```

Every module dispatches user-facing messages through `notification-engine`. Every AI module (`prescription-ai`, `invoice-ai`, `ai-engine` tools) consumes `product-intelligence` instead of re-implementing OCR/vision. Money movement (payments, subscriptions, commissions, SaaS plans) is booked into a single revenue ledger in `commerce-core`; `orders`, `payments`, `subscriptions`, `insurance` become thin adapters.

Enforcement: extend `scripts/check-imports.ts` with a module-boundary rule — a module may only import from lower layers (`core`, `platform`, and modules it declares in its `README.md`). Violations fail CI.

---

## 5. Reusable components report

| Category | Source today | Verdict |
|---|---|---|
| shadcn primitives (`Button`, `Input`, `Dialog`, `Table`, …) | `src/components/ui/**` | KEEP → move to `platform/ui-kit/primitives` |
| Titans motion (`CursorFollower`, `ParticleBackground`, `Reveal`, `CountUp`) | `src/components/titans/motion/**` | KEEP → `platform/ui-kit/motion` |
| Titans marketing (`HeroTitans`, `FeaturesTitans`, `PricingTitans`, `FooterTitans`, `TestimonialsTitans`) | `src/components/titans/sections/**` | KEEP for public `/` and `/titans` — scope to `modules/cms` |
| Admin shell fragments (`admin/*.tsx` tabs) | `src/components/admin/**` | REBUILD → decomposed into `modules/administration/ui/` |
| `AdminGate` | `src/components/admin/AdminGate.tsx` | KEEP → move to `platform/tenant-context/guards` |
| `NotificationBell`, `ShareButtons` | `src/components/titans/**` | KEEP → `modules/notifications/ui` / `platform/ui-kit` |
| Ad-hoc dashboards (`admin-hub`, `admin-command`, `admin-dashboard`, `admin-ai-executive*`) | routes | RETIRE → single `modules/administration` shell |
| `Logo3D`, `nun-divider`, `page-transition` | components | KEEP → `platform/ui-kit/brand` |
| `product-card`, `product-gallery` | components | KEEP → `modules/catalog/ui` |

---

## 6. Cross-cutting layers

- **Feature flags** — `platform/feature-flags` reads from `app_settings` (already exists). Every Phoenix migration ships behind a flag `phoenix.<module>` defaulting to OFF.
- **AI Engine** — one `modules/ai-engine` owns prompt templates, guardrails (`core/ai-safety` reused), tool registry, provider selection. Every AI feature imports the engine; no direct Lovable AI Gateway calls scattered.
- **API Gateway** — `modules/api-gateway` centralizes `/api/public/*` — HMAC verification, rate-limit, replay window. Existing hooks refactored to call gateway helpers (no route relocations required; only server-side helpers).
- **Notifications** — one `modules/notifications` unifies email + WhatsApp + Slack + in-app. Existing dispatchers (`alert-dispatch.server.ts`, `slack.functions.ts`) become adapters.
- **Audit** — every write action goes through `modules/audit` interceptor → `activity_logs`.

---

## 7. Migration strategy — strangler-fig, additive-only

For each domain module:

1. **Scaffold** the target `modules/<name>/` shell.
2. **Additive DB migration**: add `organization_id NULL` + FK + non-blocking index.
3. **Backfill** to the default organization (single-tenant tenants get a synthetic org).
4. **Dual-read/write** period: new module reads/writes go through `organization_id`; old routes ignore it.
5. **Flip flag** `phoenix.<module>=on` → new routes serve users; old routes 302 to new.
6. **Parity gate**: Playwright suite + unit tests + KPI dashboards match baseline for 7 days.
7. **Enforce**: `NOT NULL` + tighten RLS to `organization_id = current_org()`.
8. **Retire** old routes and lib files (see Deliverable 4).

No destructive DDL until Phase Nn parity gate passes. No table drops or renames — use views for shape changes.

---

## 8. UX consolidation targets

- **One admin shell** at `/admin` with left-nav grouped by module.
- **One customer app shell** at `/app` with tabs: home / prescriptions / orders / family / notifications.
- **One doctor shell** at `/doctor` with calendar / prescriptions / patients.
- **Public homepage** rebuilt: hero + "Upload prescription" + "Find medicine" + "Nearby pharmacy" — max 3 CTAs above fold, mobile-first.
- **Every primary workflow ≤ 3 taps** on mobile.

---

## 9. Non-goals for Phoenix

- No framework swap (TanStack Start stays).
- No database swap (Supabase stays).
- No auth provider swap.
- No microservices — modular monolith only.
- No destructive migrations.
