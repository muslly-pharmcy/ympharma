
# Phoenix Phase 5 — Inventory Foundation

Build enterprise inventory architecture. **No stock data migration, no marketplace activation.** Foundation only: schema, module scaffolds, RPCs, events, RLS, audit, and docs.

## Scope Boundaries

- New tables all prefixed `inv_*` / `wh_*` / `sup_*` to avoid collision with legacy `products`, `branch_inventory`, `inventory_*`, `inventory_transfers`, `transfer_items`. Legacy tables stay untouched and continue serving current app.
- No backfill from legacy tables in this phase. A follow-up phase will migrate.
- No UI wiring into existing admin pages; scaffold module `ui/` barrel only.

## 1. Database Migration (single migration, follows 4-step GRANT rule)

New tables in `public`:

- `wh_warehouses` — org-scoped physical/logical location (`kind`: central | branch | virtual), FK `branch_id` nullable, `is_active`, `metadata`.
- `wh_locations` — sub-locations inside a warehouse (aisle/shelf/bin), optional.
- `sup_suppliers` — org-scoped supplier profile (name, legal_name, tax_id, contact JSONB, status, metadata).
- `sup_supplier_products` — link `sup_suppliers` ↔ `catalog_products` with supplier SKU, lead time, default cost.
- `inv_stock_batches` — one row per (warehouse, product, batch_no, expiry_date). Columns: `qty_on_hand`, `qty_reserved`, `cost`, `selling_price`, `received_at`, `supplier_id`, `metadata`. Unique key on (warehouse_id, product_id, coalesce(batch_no,''), coalesce(expiry_date,'infinity')).
- `inv_stock_movements` — immutable ledger. `movement_type` enum: `STOCK_RECEIVED | STOCK_TRANSFERRED_OUT | STOCK_TRANSFERRED_IN | STOCK_SOLD | STOCK_ADJUSTED | STOCK_EXPIRED | STOCK_RESERVED | STOCK_RELEASED`. Fields: org, warehouse, product, batch_id, qty_delta, actor_id, reason, ref_type, ref_id, occurred_at.
- `inv_transfers` — org-scoped transfer header. `status` enum: `draft | approved | reserved | picked | packed | dispatched | received | cancelled`. Fields: source_warehouse, dest_warehouse, requested_by, approved_by, timestamps per status.
- `inv_transfer_items` — line items with `qty_requested`, `qty_reserved`, `qty_picked`, `qty_received`, batch_id nullable (auto-picked at reserve).
- `inv_expiry_alerts` — pre-computed alert rows (batch_id, tier: `NEAR_30 | NEAR_60 | NEAR_90 | EXPIRED`, alerted_at). Populated by scheduled job (contract only, no cron activation).

Enums: `wh_kind`, `inv_movement_type`, `inv_transfer_status`, `sup_status`.

Each `CREATE TABLE` followed by:
```
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
```

RLS pattern (mirrors Phase 4 catalog):
- SELECT: `is_org_member(organization_id, auth.uid())` AND (for branch-scoped) branch access via existing `branch_user_assignments` OR `has_org_permission(org, 'inventory.read')`.
- INSERT/UPDATE: `has_org_permission(org, 'inventory.write')` for stock; `has_org_permission(org, 'transfers.manage')` for transfers; `has_org_permission(org, 'suppliers.manage')` for suppliers.
- `inv_stock_movements` write: service_role + security-definer RPCs only (no direct writes from clients).

New permission keys seeded into `public.permissions` and mapped to roles in `role_permissions`:
- `inventory.read` → Owner, Admin, Manager, Pharmacist, Employee
- `inventory.write` → Owner, Admin, Manager, Pharmacist
- `transfers.read` / `transfers.manage` → Owner, Admin, Manager
- `suppliers.read` / `suppliers.manage` → Owner, Admin, Manager
- `warehouses.manage` → Owner, Admin

Security-definer RPCs (all `SET search_path = public`, revoke from anon):
- `inv_receive_stock(org, warehouse, product, qty, batch_no, expiry, cost, supplier)` — inserts batch (or upserts) + movement + emits `STOCK_RECEIVED`.
- `inv_adjust_stock(batch_id, qty_delta, reason)` — movement + emits `STOCK_MOVEMENT_CREATED`.
- `inv_reserve_for_transfer(transfer_id)` — allocates batches FEFO, updates `qty_reserved`, movement rows.
- `inv_dispatch_transfer(transfer_id)` — movements OUT + `TRANSFER_CREATED` (progress) events.
- `inv_receive_transfer(transfer_id)` — creates batches in dest warehouse, movements IN, `TRANSFER_COMPLETED`.
- `inv_scan_expiry(org, horizon_days)` — populates `inv_expiry_alerts`, emits `EXPIRY_ALERT_CREATED` per new alert.

Triggers:
- `inv_stock_batches` after INSERT/UPDATE → publish `STOCK_MOVEMENT_CREATED` via existing `agent_events` + event bus sink.
- `inv_transfers` status transitions → publish `TRANSFER_CREATED` / `TRANSFER_COMPLETED`.
- Audit inserts into `identity_audit_events` (reuse existing table) with entity `inventory.*`.

## 2. Module Scaffold — `src/modules/inventory/`

```
inventory/
  README.md
  domain/
    types.ts          # Warehouse, StockBatch, Movement, Transfer, TransferItem, ExpiryAlert
    schemas.ts        # Zod for RPC inputs
    movementTypes.ts  # enum mirror
  data/
    queries.ts        # read-only helpers over Data API
  server/
    inventory.functions.ts   # listBatches, getBatch, receiveStock, adjustStock
    transfers.functions.ts   # createTransfer, approve, reserve, pick, pack, dispatch, receive
    expiry.functions.ts      # scanExpiry, listExpiryAlerts
  events/
    schemas.ts        # zod schemas per event
  ui/
    index.ts          # empty barrel (no components yet)
  index.ts            # public barrel
```

Each server fn: `createServerFn` + `.middleware([requireSupabaseAuth])` + Zod validator + calls RPC + returns DTO. No `supabaseAdmin` at module scope; use `context.supabase` (RLS enforces org/branch).

## 3. Module Scaffold — `src/modules/warehouse/`

```
warehouse/
  README.md
  domain/{types.ts,schemas.ts}
  server/warehouse.functions.ts   # listWarehouses, createWarehouse, updateWarehouse, listLocations, addLocation
  events/schemas.ts
  ui/index.ts
  index.ts
```

## 4. Module Scaffold — `src/modules/suppliers/`

```
suppliers/
  README.md
  domain/{types.ts,schemas.ts}
  server/suppliers.functions.ts   # listSuppliers, getSupplier, createSupplier, linkProduct, unlinkProduct, listSupplierProducts
  events/schemas.ts
  ui/index.ts
  index.ts
```

## 5. Event Registry Updates

`src/core/events/constants.ts` — add:
- `STOCK_RECEIVED`
- `STOCK_MOVEMENT_CREATED`
- `TRANSFER_CREATED`
- `TRANSFER_COMPLETED`
- `EXPIRY_ALERT_CREATED`

Add zod schemas + register in `EventRegistry.ts`. Update `docs/engineering/standards/EVENT-CATALOG.md`.

## 6. Import-Graph Guard

Update `scripts/check-imports.ts` allow-list so `modules/inventory`, `modules/warehouse`, `modules/suppliers` follow same layer rules as `modules/catalog` (domain has no deps, server can import platform/core, ui cannot import server/*).

## 7. Tests

- `src/__tests__/unit/modules/inventory/movements.test.ts` — reducer that projects batch state from a movement list; asserts integrity (no negative qty_on_hand, reserved ≤ on_hand).
- `src/__tests__/unit/modules/inventory/transfer-state.test.ts` — state machine transitions (invalid transitions rejected).
- `src/__tests__/unit/modules/inventory/expiry-scan.test.ts` — pure logic bucketing NEAR_30/60/90/EXPIRED.
- `src/__tests__/unit/modules/warehouse/schemas.test.ts` — zod validation.
- `src/__tests__/unit/modules/suppliers/schemas.test.ts` — zod validation.

DB isolation verified through migration-level policies (documented in report); no live DB test runner in project.

## 8. Documentation

`docs/engineering/reports/PHOENIX-P5-inventory.md`:
- Architecture diagram (ASCII)
- Data model (table + column table)
- Security model (RLS matrix per table × role)
- Event flow (movement → event → dispatcher → downstream)
- Transfer state machine diagram
- Migration readiness checklist (what Phase 6 must do to backfill from legacy `products.stock_qty` / `branch_inventory` / `inventory_transfers`)
- Explicit non-goals (no cron, no UI, no marketplace)

## Technical Notes

- All new tables use `gen_random_uuid()` PKs, `created_at`/`updated_at` with trigger `update_updated_at_column` (already exists).
- Movement ledger is append-only: RLS denies UPDATE/DELETE for `authenticated`; only service_role.
- Batch allocation uses FEFO (first-expiry-first-out) sort in RPC.
- Reuses Phase 3 `has_org_permission` and existing `is_org_member(_org uuid, _user uuid)` signatures.
- Emits events through the Phase 2 EventPublisher pattern; DB triggers write to `agent_events` for the consumer.

## Deliverables Summary

1. One migration (tables + enums + grants + RLS + RPCs + triggers + permission seed).
2. Three module scaffolds (`inventory`, `warehouse`, `suppliers`) with domain, server fns, events, empty UI barrel.
3. Event constants + registry + catalog doc update.
4. Import-graph guard update.
5. Five unit tests.
6. Phase 5 completion report.

Stop after Phase 5. Await Phase 6.
