# Phoenix Phase 5 — Inventory / Warehouse / Suppliers Foundation

**Status:** CLOSED
**Scope:** Enterprise inventory architecture. No existing-stock migration, no marketplace ordering.

## Architecture

Three cooperating modules under `src/modules/`:

- `inventory/` — batches, movements ledger, transfers, expiry alerts.
- `warehouse/` — warehouses per organization + optional sub-locations.
- `suppliers/` — supplier profiles + supplier-to-catalog product bridge.

Each module exposes `domain/` (types + Zod schemas), `data/` (browser reads
via publishable client, RLS applies), `server/` (`createServerFn` + auth
middleware for writes), `events/` (domain event constants).

## Data Model

| Table | Purpose |
|-------|---------|
| `wh_warehouses` | Warehouses per organization (central / branch / virtual / transit). |
| `wh_locations`  | Sub-locations inside a warehouse (aisle/shelf/bin). |
| `sup_suppliers` | Supplier profiles per organization. |
| `sup_supplier_products` | Supplier ↔ `catalog_products` bridge with SKU, cost, lead time. |
| `inv_stock_batches` | Per warehouse × product × batch × expiry. `qty_on_hand`, `qty_reserved`, cost, price. Unique `(warehouse, product, batch_no, expiry_date)`. |
| `inv_stock_movements` | Append-only ledger. Every quantity change is a row (RECEIVED, SOLD, TRANSFERRED_IN/OUT, ADJUSTED, EXPIRED, RESERVED, RELEASED). |
| `inv_transfers` | Transfer workflow row (`draft → approved → reserved → picked → packed → dispatched → received → cancelled`). |
| `inv_transfer_items` | Requested / reserved / picked / received quantities per line. |
| `inv_expiry_alerts` | Deduped alerts per batch × tier (`NEAR_90`, `NEAR_60`, `NEAR_30`, `EXPIRED`). |

## Security

- All tables have `RLS ENABLED`.
- Read = `is_org_member(organization_id, auth.uid())`.
- Writes gated by new permissions seeded into `permissions` and
  `role_permissions`:
  - `warehouses.manage` — Owner, Admin.
  - `inventory.read` — Owner, Admin, Manager, Pharmacist, Employee.
  - `inventory.write` — Owner, Admin, Manager, Pharmacist.
  - `suppliers.read/manage` — Owner, Admin, Manager.
  - `transfers.read/manage` — Owner, Admin, Manager.
- `inv_stock_movements` is **read-only to `authenticated`**. Writes only via
  `SECURITY DEFINER` RPCs (`service_role` retains full access for admin
  jobs). This guarantees ledger integrity.
- RPCs (`inv_receive_stock`, `inv_adjust_stock`, `inv_reserve_for_transfer`,
  `inv_dispatch_transfer`, `inv_receive_transfer`, `inv_scan_expiry`) all
  `REVOKE ... FROM PUBLIC, anon` and `GRANT EXECUTE TO authenticated`, then
  re-check `has_org_permission(auth.uid(), _org, ...)` inside the body.

## Stock Movement Engine

- Every RPC that changes quantity writes an `inv_stock_movements` row with
  actor, organization, warehouse, batch, delta, reason, and optional
  `ref_type`/`ref_id` (e.g. `inv_transfer`).
- Reserve uses **FEFO** (`ORDER BY expiry_date ASC, received_at ASC`) with
  `FOR UPDATE` row locks.

## Transfer Workflow

```text
draft → approved → reserved → picked → packed → dispatched → received
                                                         ↘ cancelled
```

- `inv_reserve_for_transfer` moves state `draft/approved → reserved`,
  increments `qty_reserved` in FEFO order, writes `STOCK_RESERVED` movements.
- `inv_dispatch_transfer` moves state `reserved/picked/packed → dispatched`,
  decrements `qty_on_hand` + `qty_reserved`, writes `STOCK_TRANSFERRED_OUT`.
- `inv_receive_transfer` moves state `dispatched → received`, upserts
  batches in the destination warehouse, writes `STOCK_TRANSFERRED_IN`.

## Expiry Intelligence (Foundation)

- `inv_scan_expiry(_org, _horizon_days)` scans batches with `qty_on_hand > 0`
  and `expiry_date ≤ today + horizon`, classifies into tier, and dedupes
  via `UNIQUE (batch_id, tier)` before emitting `EXPIRY_ALERT_CREATED`.
- No AI yet — pure SQL tiering.

## Events

Emitted into `agent_events` via `public.inv_emit_event`:

- `STOCK_RECEIVED`
- `STOCK_MOVEMENT_CREATED`
- `TRANSFER_CREATED`
- `TRANSFER_COMPLETED`
- `EXPIRY_ALERT_CREATED`

Payload always includes `organization_id`, plus entity-specific keys
(`batch_id`, `product_id`, `warehouse_id`, `tier`, `qty`, `status`).

## Migration Readiness

- No stock data was migrated. Existing `products.stock_qty` is untouched.
- A future Phase 5.1 will backfill `inv_stock_batches` from legacy
  `branch_inventory` + `products.stock_qty` and cut over reads.

## Verification

- ✅ Organization isolation via RLS + `is_org_member`.
- ✅ Branch link available (`wh_warehouses.branch_id` optional FK) for
  branch-scoped views in Phase 6.
- ✅ Permission checks in every state-changing RPC.
- ✅ Ledger integrity: `inv_stock_movements` has no `INSERT/UPDATE/DELETE`
  grant to `authenticated`.
- ✅ Migration applied cleanly. Linter warnings are pre-existing repo
  baseline; all new functions ship with `SET search_path = public` and
  `REVOKE ... FROM PUBLIC, anon`.
- ✅ Build/typecheck run by harness.

## Awaiting Phase 6 approval.
