## Phoenix Pharmacy Network — Foundation Plan

Build a national pharmacy discovery layer on top of existing `catalog_products`, `search_medicines_public`, and `organizations` (each pharmacy = an organization). No payments, no live transfers yet — just discovery + scaffolding for future exchange.

### 1. Database (single migration)

New tables (all `public.pn_*`, RLS on, GRANTs applied):

- `pn_pharmacies` — one row per pharmacy org: `organization_id`, `slug`, `name_ar/en`, `phone`, `whatsapp`, `city`, `district`, `address`, `lat`, `lng`, `logo_url`, `is_public`, `verification_status` (pending/verified/rejected), `verified_at`.
- `pn_pharmacy_hours` — weekday, `open_time`, `close_time`, `is_24_7`.
- `pn_pharmacy_stock` — `pharmacy_id`, `catalog_product_id`, `availability` (in_stock/low/out), `price_yer` (nullable, hidden by default), `expiry_date` (nullable), `updated_at`. Unique(pharmacy_id, catalog_product_id).
- `pn_verification_requests` — submission + reviewer audit.
- `pn_transfer_requests` (scaffold only, no execution): `from_pharmacy_id`, `to_pharmacy_id`, `catalog_product_id`, `qty`, `reason` (near_expiry/shortage), `status` (draft/pending/accepted/rejected/cancelled). No stock movement yet.

RLS:
- `pn_pharmacies`: anon SELECT where `is_public AND verification_status='verified'`; org members full; admin verify.
- `pn_pharmacy_stock`: anon SELECT joined to public pharmacy; pharmacy owner/manager write.
- `pn_transfer_requests`: only involved pharmacies + admin.

RPCs (SECURITY DEFINER, revoke anon where private):
- `pn_search_medicine_nearby(_q text, _lat float8, _lng float8, _radius_km int, _limit int)` — joins `search_medicines_public` → `pn_pharmacy_stock` → `pn_pharmacies`, computes haversine distance, returns pharmacy + availability + contact + distance_km.
- `pn_get_pharmacy_public(_slug text)` — profile + hours + summary counts.
- `pn_list_pharmacy_products(_slug text, _q text, _limit int, _offset int)` — public product listing.
- `pn_upsert_stock`, `pn_bulk_upsert_stock` — pharmacy-scoped writes.
- `pn_submit_verification`, `pn_verify_pharmacy` (admin).
- `pn_request_transfer` — inserts a `pn_transfer_requests` row only; explicit comment `-- NO stock movement; marketplace disabled`.

Seed: 5 demo pharmacies in Aden (verified) with hours + ~15 stock rows each, using existing `catalog_products` IDs.

### 2. Module scaffolding (`src/modules/pharmacy-network/`)

```
domain/{types,schemas}.ts
server/pharmacies.functions.ts   # searchNearby, getPharmacyPublic, listPharmacyProducts
server/stock.functions.ts        # upsertStock, bulkUpsert (requireSupabaseAuth)
server/transfers.functions.ts    # requestTransfer, listMyTransfers (scaffold)
components/PharmacyCard.tsx      # extend existing medical/PharmacyCard
components/PharmacyResultCard.tsx  # medicine + pharmacy + distance + CTA
components/HoursTable.tsx
components/StockBadge.tsx
components/DistanceBadge.tsx
index.ts
```

Public server functions use the server publishable client (anon key + apikey shim) — same pattern as `product-intelligence/server/intelligence.functions.ts`. Writes go through `requireSupabaseAuth`.

### 3. Routes

**Patient (public):**
- `src/routes/pharmacies.tsx` → `/pharmacies` — search box (medicine name, powered by `medicineNormalize`), optional "use my location" button (browser geolocation, sent as search params `lat`/`lng`/`r`), results grouped by medicine → list of pharmacies sorted by distance. Falls back to city filter if no coords.
- `src/routes/pharmacies.$slug.tsx` → `/pharmacies/:slug` — profile: header, hours, verified badge, WhatsApp/phone CTAs, searchable product list with availability badges. og:image from pharmacy `logo_url`.

**Pharmacy owner (authenticated, under `_authenticated/pharmacy/`):**
- `pharmacy-profile.tsx` — edit profile + hours + submit verification.
- `pharmacy-stock.tsx` — table with search + inline availability/price/expiry edit; CSV/paste bulk import (reuses catalog search for matching).
- `pharmacy-transfers.tsx` — list scaffold; "Request transfer" form (disabled state banner: "التبادل بين الصيدليات — قريباً").

Nav: add "🏥 الصيدليات" to `SiteHeader` public nav; add "لوحة الصيدلية" group under authenticated user menu when the user has pharmacy org membership.

### 4. Near-expiry / transfer preparation (no execution)

- `pn_pharmacy_stock.expiry_date` + a scheduled RPC `pn_flag_near_expiry(_days int default 90)` that writes into existing `inv_expiry_alerts` (already exists). No cron scheduled in this phase — RPC defined only.
- `pn_transfer_requests` accepts drafts; UI clearly marks "قريباً — لن يتم النقل الفعلي بعد".

### 5. Deliberately deferred

- Marketplace payments / order flow.
- Actual `inv_stock_movements` writes on transfer accept.
- Cron for expiry sweep.
- Push notifications to pharmacies for incoming transfers.
- Distance filter using PostGIS (haversine in SQL is enough at current scale).

### 6. Report

`docs/engineering/reports/PHOENIX-PHARMACY-NETWORK.md` covering: schema, RPCs, RLS, module map, routes, seed, security (anon exposure limited to verified public pharmacies + availability/contact only; prices optional), and explicit list of deferred marketplace features.

### Acceptance
- Migration approved and applied; `bun run build:dev` exits 0; typecheck 0.
- `/pharmacies?q=paracetamol` returns seeded Aden pharmacies with distance when geolocation provided.
- `/pharmacies/{slug}` renders profile + product list.
- Pharmacy owner can edit stock and submit for verification.
- Transfer form saves a draft row; no stock ledger writes occur.
- Report committed.

Approve to proceed.
