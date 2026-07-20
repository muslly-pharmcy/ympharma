
# Phase 3 — Enterprise Business Foundation

## Reality Check (must read before I code)

The Lovable Cloud database **already contains** most of the tables Sprint 3.1–3.3 asks for. Ignoring them and creating a fresh `products` / `warehouses` / `suppliers` schema would fork the data model and break every existing surface (invoice extraction, pharmacy stock, transfers, AI signals, image overrides, etc.).

Existing tables I will build on, not replace:

| Domain | Existing tables |
|---|---|
| Catalog | `catalog_products`, `catalog_categories`, `catalog_barcodes`, `catalog_product_media`, `catalog_product_aliases`, `catalog_ai_signals`, `product_classifications`, `product_gallery_images`, `product_image_overrides` |
| Warehouse | `wh_warehouses`, `wh_locations`, `branches`, `branch_inventory` |
| Stock | `inv_stock_batches`, `inv_stock_movements`, `inv_transfers`, `inv_transfer_items`, `inv_expiry_alerts`, `inventory_alerts`, `inventory_reservation_state`, `inventory_shadow_log` |
| Supplier | `sup_suppliers`, `sup_supplier_products`, `supplier_link_audit` |
| Events | `ai_events`, `agent_events`, `agent_events_dlq` |

Legacy `products` (used by `InventoryModule.tsx`) and legacy `inventory` types are the ones that need to be phased out toward `catalog_products` + `inv_stock_batches`.

## Scope I recommend for this pass

Doing all 7 sprints + tests + full multi-tenant refactor + import/export + bulk edit + purchase orders in a single turn produces low-quality, unreviewable code. I will deliver Phase 3 in two shipments:

### Shipment A (this turn) — Catalog + Inventory read paths on real tables

1. **Domain layer** (`src/domain/catalog/`, `src/domain/inventory/`, `src/domain/suppliers/`)
   - Zod schemas + TS types mapped 1:1 to existing Supabase tables (`CatalogProduct`, `CatalogCategory`, `StockBatch`, `Warehouse`, `Supplier`).
   - Deprecate legacy `Product` / `InventoryItem` in `src/types/index.ts` (kept as `@deprecated` re-exports).

2. **Data access via server functions** (`src/lib/catalog.functions.ts`, `inventory.functions.ts`, `suppliers.functions.ts`)
   - `listProducts({ search, categoryId, page, pageSize, lowStockOnly })` — paginated, RLS via `requireSupabaseAuth`.
   - `getProduct({ id })` with joined batches, media, barcodes.
   - `listCategories`, `listBrands` (derived), `listSuppliers`, `getStockSummary({ productId })`.
   - Event emission helper `emitDomainEvent(type, payload)` writing to `ai_events` (used by all mutations from Shipment B).

3. **New authenticated routes** (page shells calling the server fns)
   - `/_authenticated/catalog` — searchable, paginated product list.
   - `/_authenticated/catalog/$productId` — details, batches, suppliers, media.
   - `/_authenticated/warehouses` — warehouses + branch summary.
   - `/_authenticated/suppliers` — supplier list.

4. **Rewire `InventoryModule.tsx`** to consume the new `listProducts` server fn (no more direct `supabase.from('products')` against a table that isn't the source of truth).

5. **DB migration (small, additive)** — no new tables, only:
   - Missing indexes on `catalog_products (is_active, category_id)`, `inv_stock_batches (product_id, expiry_date)`.
   - `updated_at` trigger where missing.
   - `emit_domain_event(text, jsonb)` SQL helper that inserts into `ai_events` with a canonical shape.

### Shipment B (next turn, on your approval)

- CRUD writes (create/edit product, upload media, edit category/brand/manufacturer).
- Stock movements UI (receive, transfer, adjust) wired to `inv_stock_movements` with FEFO reservation.
- Purchase orders (needs a new `purchase_orders` + `purchase_order_items` table — flagged separately for approval).
- Bulk import/export (CSV) and barcode lookup endpoint.
- Vitest suites for domain + server fns (Sprint 3.7).

## Acceptance criteria for Shipment A

- `tsgo --noEmit` clean, no new lint errors.
- SSR still returns 200 on `/`, `/login`, `/_authenticated/catalog`.
- Catalog list renders real rows from `catalog_products` under RLS (falls back to empty state, not crash, when the caller has no rows).
- No new tables in this shipment; only indexes + one helper function.
- `emit_domain_event` writes a row to `ai_events` for at least one call path (verified with a `supabase--read_query`).

## Out of scope for Shipment A (explicitly)

- Writes / mutations / image upload UI.
- Purchase orders, receiving, supplier performance scoring.
- Reservation engine, cost recalculation, reorder engine.
- Full test suite.
- Multi-tenant `organization_id` scoping refactor (tables already carry it; UI-level tenant switcher is a separate phase).

## Approve to proceed

Reply **"go A"** to execute Shipment A as scoped above, or tell me which items to add/remove. If you want me to plow through everything in one turn regardless of the risk, say **"go all"** and I'll do it — but expect thinner tests and larger diffs.
