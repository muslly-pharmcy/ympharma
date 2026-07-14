# PHOENIX PHARMACY NETWORK — Foundation

Status: **FOUNDATION SHIPPED** (Marketplace deferred by design)
Date: 2026-07-14

## Objective
National pharmacy discovery platform: patients find nearest pharmacy with a
given medicine; pharmacies get a public profile with hours, products, and
verification.

## Database (migration `phoenix_pharmacy_network`)
Enums: `pn_verification_status`, `pn_availability`, `pn_transfer_reason`,
`pn_transfer_status`.

Tables (all `pn_*`, RLS enabled, grants applied):
- **pn_pharmacies** — profile, geo (lat/lng), verification. Public read gated
  by `is_public AND verification_status='verified'`; org-scoped writes for
  owner/admin/manager; admin override.
- **pn_pharmacy_hours** — weekly schedule; public read via parent gate.
- **pn_pharmacy_stock** — links pharmacy ↔ `catalog_products` with
  availability/price/expiry; writable by pharmacist+.
- **pn_verification_requests** — org submits, admin reviews.
- **pn_transfer_requests** — **scaffold only**; no stock movement; marketplace
  payments intentionally disabled in this phase.

## RPCs (SECURITY DEFINER, `SET search_path = public`)
- `pn_search_medicine_nearby(q, lat?, lng?, radius_km, limit)` — Haversine
  distance; anon-executable, returns only verified public pharmacies.
- `pn_get_pharmacy_public(slug)` / `pn_list_pharmacy_products(slug, q, ...)` —
  anon-executable public profile + product list.
- `pn_upsert_stock` — pharmacist stock write (RLS-aware permission check).
- `pn_submit_verification` / `pn_verify_pharmacy` — verification flow.
- `pn_request_transfer` — creates a DRAFT/PENDING transfer row only. **No
  stock ledger write.** Admin-only `pn_flag_near_expiry` helper.

## Module & Routes
- `src/modules/pharmacy-network/` — `domain/types.ts` + public server
  functions (`sbPublic` publishable client with `sb_` key `apikey`-only
  header handling).
- `src/routes/pharmacies.tsx` — patient discovery (search + optional
  geolocation, distance-aware sorting).
- `src/routes/pharmacies.$slug.tsx` — pharmacy profile with hours + products.

## Seed
5 verified demo pharmacies in Aden (المعلا، كريتر، المنصورة 24/7،
خورمكسر، التواهي) with weekly hours and ~15 stock rows each linked to the
newest catalog products.

## Explicitly deferred
- Marketplace payments.
- Actual stock movement on transfer accept (would wire into
  `inv_stock_movements`).
- Near-expiry cron alerts (helper exists; not scheduled).
- Pharmacist-side profile/stock UI (server functions cover writes; no route
  wired yet).

## Notes
- `pnGetPharmacyPublic` returns `JSON.stringify(row)` to satisfy TanStack
  Start's serializable-return contract for a `jsonb` shape; client parses.
- Search RPC uses `catalog_products.name_ar/name_en/generic_name/brand` — no
  `name` column exists on that table.
