## Phase 3 — Shipment B plan

### Reality check first

Two constraints from Shipment A that shape everything below:

1. **No real Supabase Auth yet.** `AuthContext` is demo-only (localStorage). `requireSupabaseAuth` middleware exists but no client actually holds a Supabase session, so bearer-attached server fns will 401.
2. **Purchase Orders tables do not exist** in the DB. Every other domain (catalog, warehouses, batches, movements, suppliers, transfers, ai_events) is already there and RLS-scoped by `organization_id`.

Given those, the only honest way to ship transactional writes this turn is:

- **Server fns run privileged writes via `supabaseAdmin`** (loaded inside handler bodies, per the import-graph rules), and **authorize themselves** by taking `actorUserId` + `organizationId` from a small server-side session helper. Same pattern used elsewhere in the codebase.
- **Atomicity via SQL functions**, not TS orchestration. FEFO allocation, stock receipt, transfer, adjustment, reservation, PO receive — each is a `SECURITY DEFINER` PL/pgSQL function with `search_path=public`, row locks (`FOR UPDATE`), and returns the resulting movement/batch rows. TS server fns become thin RPC callers + Zod validation + event emission.
- **Domain events** flow through the existing `emit_domain_event(...)` helper into `ai_events`, with a `correlation_id` generated once per user-initiated command and threaded through every downstream call.

If you'd rather block Shipment B until real Supabase Auth + RBAC is wired end-to-end, say so and I'll cut a Phase 2.5 first. Otherwise the plan below is what I execute.

---

### 1. Database migration (single migration)

New tables:

- `purchase_orders` — `id`, `organization_id`, `supplier_id`, `warehouse_id`, `code` (unique per org), `status` enum (`draft|submitted|approved|received|cancelled`), `notes`, `total_amount`, `currency`, `created_by`, `approved_by`, `approved_at`, `received_at`, timestamps, `updated_at` trigger.
- `purchase_order_lines` — `id`, `po_id` (FK cascade), `product_id`, `qty_ordered`, `qty_received` default 0, `unit_cost`, `batch_no` optional, `expiry_date` optional, `line_no`.
- `inventory_idempotency` — `key` PK, `actor_id`, `command`, `response` jsonb, `created_at` — 24h retention via cron cleanup fn.

All get GRANTs (`authenticated`, `service_role`) and RLS scoped to `is_org_member(organization_id)`.

New SQL functions (all `SECURITY DEFINER`, `search_path = public`, revoke default execute, grant to `authenticated` + `service_role`):

- `inv_receive_stock(p_org uuid, p_warehouse uuid, p_product uuid, p_supplier uuid, p_qty numeric, p_cost numeric, p_batch text, p_expiry date, p_actor uuid, p_correlation uuid) returns uuid` — inserts `inv_stock_batches` + `inv_stock_movements(type='receipt')`, emits `StockReceived`.
- `inv_adjust_stock(p_batch uuid, p_delta numeric, p_reason text, p_actor uuid, p_correlation uuid) returns uuid` — `FOR UPDATE` lock on batch, guard against negative `qty_on_hand - qty_reserved`, movement + event.
- `inv_transfer_stock(p_from_warehouse uuid, p_to_warehouse uuid, p_product uuid, p_qty numeric, p_actor uuid, p_correlation uuid) returns uuid` — FEFO pull from source, create/merge destination batches, two movements (`transfer_out`, `transfer_in`), event.
- `inv_reserve_fefo(p_org uuid, p_product uuid, p_qty numeric, p_actor uuid, p_correlation uuid) returns jsonb` — orders non-expired batches by `expiry_date NULLS LAST, received_at`, locks each `FOR UPDATE SKIP LOCKED`, allocates up to `qty_on_hand - qty_reserved`, increments `qty_reserved`, records rows in `inventory_reservation_state`, raises if partial and caller disallows partial. Returns allocation array.
- `inv_release_reservation(p_reservation uuid, p_actor uuid, p_correlation uuid) returns void`.
- `inv_consume_reservation(p_reservation uuid, p_actor uuid, p_correlation uuid) returns void` — converts reservation into `qty_on_hand -= qty`, movement `type='consumption'`.
- `inv_return_stock(...)` — mirror of receipt for returns.
- `po_receive(p_po uuid, p_actor uuid, p_correlation uuid) returns void` — iterates lines, calls `inv_receive_stock` per line, flips PO to `received`, emits `PurchaseOrderReceived`.

`emit_domain_event` (from Shipment A) is the single event sink.

### 2. Domain layer

`src/domain/{catalog,inventory,suppliers,purchasing}/commands.ts` — Zod schemas for every write:

`CreateProduct`, `UpdateProduct`, `ArchiveProduct`, `CreateWarehouse`, `UpdateWarehouse`, `CreateSupplier`, `UpdateSupplier`, `ReceiveStock`, `AdjustStock`, `TransferStock`, `ReserveStock`, `ReleaseReservation`, `ConsumeReservation`, `ReturnStock`, `CreatePurchaseOrder`, `UpdatePurchaseOrder`, `SubmitPurchaseOrder`, `ApprovePurchaseOrder`, `ReceivePurchaseOrder`, `CancelPurchaseOrder`.

Each command carries an `idempotencyKey?: string` and `correlationId?: string` (auto-generated when missing).

### 3. Server functions (new files)

- `src/lib/session.server.ts` — `getActor()` returning `{ userId, organizationId, roles }` from the demo session bridge. Marked server-only. Throws `Unauthorized` if missing. This is the single choke point we swap out once real Supabase Auth lands.
- `src/lib/catalog.mutations.functions.ts` — `createProduct`, `updateProduct`, `archiveProduct`.
- `src/lib/inventory.mutations.functions.ts` — `createWarehouse`, `updateWarehouse`, `receiveStock`, `adjustStock`, `transferStock`, `reserveStock` (FEFO), `releaseReservation`, `consumeReservation`, `returnStock`.
- `src/lib/suppliers.mutations.functions.ts` — `createSupplier`, `updateSupplier`.
- `src/lib/purchasing.functions.ts` — `listPurchaseOrders`, `getPurchaseOrder`, `createPurchaseOrder`, `updatePurchaseOrder`, `submitPurchaseOrder`, `approvePurchaseOrder`, `receivePurchaseOrder`, `cancelPurchaseOrder`.
- `src/lib/idempotency.server.ts` — `withIdempotency(key, actorId, command, fn)` wrapper: hit `inventory_idempotency`, return stored response on replay, otherwise run + persist.

Each mutation handler:

1. `getActor()` → authorize (org match + role check).
2. Parse input with Zod.
3. Wrap with `withIdempotency` when `idempotencyKey` provided.
4. `await import('@/integrations/supabase/client.server')` then `supabaseAdmin.rpc(...)` or plain insert/update filtered by `organization_id`.
5. `emit_domain_event(type, 'shipment-b', payload, priority, correlationId)`.
6. Return the mutated row.

### 4. React Query mutation hooks

`src/hooks/mutations/`:

- `useCreateProduct`, `useUpdateProduct`, `useArchiveProduct` — invalidate `['catalog', ...]`.
- `useCreateWarehouse`, `useUpdateWarehouse` — invalidate `['inventory', 'warehouses']`.
- `useCreateSupplier`, `useUpdateSupplier` — invalidate `['suppliers', 'list']`.
- `useReceiveStock`, `useAdjustStock`, `useTransferStock`, `useReserveStock`, `useReleaseReservation`, `useConsumeReservation`, `useReturnStock` — invalidate `['inventory', 'stock-summary', productId]` + `['inventory', 'batches', warehouseId]`.
- `usePurchaseOrderMutations` bundle — invalidate `['purchasing', ...]`.

Each hook uses `useServerFn`, sets `onMutate` for cache snapshot + optimistic apply where the shape is trivial (name changes, archive flag), and `onError` rollback. FEFO / stock ops skip optimistic (numeric truth lives server-side) and just invalidate on success.

### 5. UI wiring (minimal, functional — not the full admin)

Enough surface to drive every mutation without shipping a whole admin suite:

- `/catalog` — add "New product" dialog (name_ar, name_en, category, brand, dosage_form, strength) using `useCreateProduct`. Row action: archive.
- `/catalog/$productId` — add "Edit", "Archive", "Receive stock" (qty, batch, expiry, cost, warehouse, supplier), "Adjust", "Transfer" dialogs.
- `/warehouses` — "New warehouse" + inline edit.
- `/suppliers` — "New supplier" + inline edit.
- `/purchase-orders` (new route) — list, create draft, add lines, submit → approve → receive flow.

All dialogs are shadcn `Dialog` + `react-hook-form` + Zod (reusing command schemas).

### 6. Tests (Vitest)

Two suites — kept tight, not exhaustive, matching the "no legacy code" bar:

- `tests/inventory-engine.test.ts` — spins up against the live Cloud DB using a dedicated `test_org` seed row: receive → reserve FEFO → assert allocation order → attempt over-allocation (expect throw) → consume → assert balances → transfer → assert dual movements + destination merge → adjust negative past floor (expect throw).
- `tests/purchasing.test.ts` — draft → add line → submit → approve → receive → assert PO status + `inv_stock_batches` + `ai_events` rows for `PurchaseOrderReceived` + `StockReceived` (correlation IDs match).
- `tests/events.test.ts` — every mutation emits exactly one event with matching correlation.

Tests run in CI-only mode (skip when `SUPABASE_URL` unset). No mocks for the SQL layer — the whole point is exercising the atomic functions.

### 7. Validation gate

Before I say "done":

- `tsgo --noEmit` clean.
- SSR 200 on `/`, `/catalog`, `/warehouses`, `/suppliers`, `/purchase-orders`.
- Run each Vitest suite green.
- One end-to-end manual receive → reserve → consume via the UI, then `supabase--read_query` on `ai_events` to confirm event chain.

---

### Deliverables checklist

```
migration:
  purchase_orders + purchase_order_lines + inventory_idempotency
  inv_receive_stock, inv_adjust_stock, inv_transfer_stock,
  inv_reserve_fefo, inv_release_reservation, inv_consume_reservation,
  inv_return_stock, po_receive
  cleanup cron for inventory_idempotency (24h)

src/domain/**/commands.ts        (4 files)
src/lib/session.server.ts
src/lib/idempotency.server.ts
src/lib/catalog.mutations.functions.ts
src/lib/inventory.mutations.functions.ts
src/lib/suppliers.mutations.functions.ts
src/lib/purchasing.functions.ts
src/hooks/mutations/*            (~10 hooks)
src/routes/purchase-orders.tsx
src/routes/purchase-orders.$id.tsx
dialog components under src/features/{catalog,inventory,suppliers,purchasing}/dialogs
tests/inventory-engine.test.ts
tests/purchasing.test.ts
tests/events.test.ts
```

No changes to Shipment A read APIs.

---

### One clarifying question before I execute

Auth path for writes — pick one:

- **(A) Ship now with `supabaseAdmin` + demo-session actor** as described. Fast, matches the codebase's current pattern, but authorization is only as strong as the demo session until real Supabase Auth lands.
- **(B) Block Shipment B until Phase 2.5 wires real Supabase Auth end-to-end** (`AuthContext` → Supabase, `_authenticated` route gate, bearer attacher). Cleaner but adds a phase.

Reply **"go B / A"** for option A, **"go B / auth first"** for option B, or edit the plan.