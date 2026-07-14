
# Phoenix Phase 4 — Catalog + Media Library Foundation

Legacy `public.products` (single-tenant commerce SKU) stays untouched. Phase 4 adds a **parallel catalog layer** the rest of Phoenix will build on. Inventory quantities and marketplace ordering are explicitly out of scope.

## 1. Database (single migration)

New tables under `public`. All follow: CREATE TABLE → GRANT (authenticated + service_role; anon only where noted) → ENABLE RLS → policies. Every table gets `created_at` / `updated_at` + trigger.

- **`catalog_categories`** — `id, organization_id (nullable = global), parent_id, slug, name_ar, name_en, sort_order, is_active`.
- **`catalog_products`** — the new catalog record.
  - `id, organization_id (nullable = global/shared catalog), owner_org_id (writer), category_id`
  - `name_ar, name_en, generic_name, brand, manufacturer`
  - `barcode` (unique per org via partial index), `active_ingredients jsonb`, `dosage_form`, `strength`
  - `description_ar, description_en, metadata jsonb`
  - `status ENUM('draft','pending_review','approved','rejected','archived')`
  - `is_public boolean` (only meaningful when `status='approved'`)
  - `verified_at, verified_by`
- **`catalog_product_aliases`** — `id, product_id, alias, alias_normalized, locale ('ar'|'en'|'mixed'), source ('manual'|'ocr'|'ai'|'import'), confidence`. Powers Arabic/English spelling variants (فيتامين / فتمين / vitamin).
- **`catalog_product_media`** — `id, product_id, storage_bucket, storage_path, kind ('primary'|'gallery'|'thumbnail'|'barcode'), width, height, bytes, checksum, mime, status ('pending'|'approved'|'rejected'), uploaded_by, reviewed_by, reviewed_at, sort_order, metadata jsonb`.
- **`catalog_barcodes`** — normalized barcode index: `barcode, product_id, symbology, is_primary`.
- **`catalog_ai_signals`** — contract-only table for future OCR / barcode / image / invoice / prescription AI: `product_id (nullable), signal_type, source, payload jsonb, confidence, status, correlation_id`. No AI code shipped; the table is the integration seam.

### Enums
`catalog_status`, `catalog_media_kind`, `catalog_media_status`, `catalog_alias_source`, `catalog_ai_signal_type`.

### Storage
New private bucket **`catalog-media`** via `supabase--storage_create_bucket`. RLS on `storage.objects` restricts writes to org members with `catalog.write`; reads limited to org members OR approved+public rows via a security-definer helper.

### SECURITY DEFINER helpers
- `catalog_normalize_ar(text)` — strips tashkeel, unifies ا/أ/إ/آ, ى→ي, ة→ه, ؤ/ئ, digits, whitespace. Pure SQL, `IMMUTABLE`.
- `catalog_search(_q text, _org_id uuid, _limit int)` — matches name/generic/aliases via normalized text + `pg_trgm`. Fail-closed on org scope.
- `catalog_can_write(_user_id, _org_id)` → uses `has_org_permission(..., 'catalog.write')`.
- `catalog_can_verify(_user_id, _org_id)` → `catalog.verify`.

### Permissions seed (extends Phase 3)
`catalog.read · catalog.write · catalog.verify · catalog.media.upload · catalog.media.review`.
Baseline `role_permissions` grants: owner/admin → all; manager → read+write+media.upload; pharmacist/doctor → read; customer → none.

### RLS summary
- `catalog_products` SELECT: `is_public AND status='approved'` (anon+authenticated) OR `is_org_member(organization_id)` (authenticated). Writes: `catalog_can_write`.
- `catalog_product_aliases`, `catalog_product_media`, `catalog_barcodes`: readable when parent is readable; writes gated by `catalog.write` / `catalog.media.upload`; approve/reject gated by `catalog.verify` / `catalog.media.review`.
- `catalog_categories`: global rows (`organization_id IS NULL`) readable by all; org rows gated by membership.
- `catalog_ai_signals`: writes service_role only; reads gated by `catalog.read` in org.

### Indexes
- `catalog_products (organization_id, status)`, `(barcode) WHERE barcode IS NOT NULL`, GIN trigram on `name_ar`, `name_en`, `generic_name`.
- `catalog_product_aliases (alias_normalized)` GIN trigram + `(product_id)`.
- `catalog_barcodes (barcode)` unique per `product_id`.

### Triggers
- `updated_at` on every table.
- Alias insert/update: auto-populate `alias_normalized = catalog_normalize_ar(alias)`.
- Product transition triggers emit rows into `organization_audit_events` for `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_VERIFIED`; media insert emits `PRODUCT_IMAGE_ADDED`. All events also enqueue an `agent_events` row consumed by the Phase 2 event bus.

## 2. Platform / module code

New module `src/modules/catalog/` following `MODULE-STRUCTURE.md`:

```
src/modules/catalog/
  domain/       types.ts, schemas.ts (Zod), normalize.ts (mirrors SQL)
  data/         queries.ts (read helpers)
  server/       catalog.functions.ts (createServerFn, guarded by PermissionService)
                media.functions.ts (signed-URL upload + review flow)
                aiSignals.functions.ts (write path service-role only)
  events/       constants.ts, schemas.ts (Zod), publisher.ts
  ui/           empty; UI ships in later phase
  index.ts      public barrel
  README.md
```

Server functions (all `requireSupabaseAuth` + `PermissionService.require`):

- `listCatalogProducts({ orgId, q?, status?, cursor })`
- `getCatalogProduct({ id })`
- `createCatalogProduct(payload)`
- `updateCatalogProduct({ id, patch })`
- `submitForReview({ id })` / `verifyCatalogProduct({ id })` / `rejectCatalogProduct({ id, reason })`
- `addProductAlias({ productId, alias, locale, source })`
- `requestMediaUploadUrl({ productId, kind, mime, bytes })` → signed URL to `catalog-media` bucket (size/mime whitelist enforced).
- `registerUploadedMedia({ productId, storagePath, kind, checksum, ... })` → row in `catalog_product_media`, status=`pending`.
- `reviewMedia({ id, decision, reason? })`.
- `recordAiSignal(...)` — service-role only, module-internal, no client exposure.

### Search foundation
`searchCatalog({ orgId, q, limit })` invokes `catalog_search` RPC. Uses Arabic normalization + trigram similarity + alias join. Barcode lookup path: `lookupByBarcode({ barcode, orgId })` hits `catalog_barcodes`.

### Events
Register in `src/core/events/constants.ts`: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_IMAGE_ADDED`, `PRODUCT_VERIFIED`. Payload schema in `modules/catalog/events/schemas.ts` (Zod): `{ org_id, actor_user_id, product_id, data }`. Publisher wires through Phase 2 `EventPublisher` with idempotency keys.

### AI integration contract (no models yet)
`src/modules/catalog/domain/aiContract.ts` exports Zod schemas + TypeScript interfaces only:
`OcrExtractionInput/Result`, `BarcodeRecognitionInput/Result`, `ImageRecognitionInput/Result`, `InvoiceParseInput/Result`, `PrescriptionParseInput/Result`. Each maps to a `catalog_ai_signal_type` enum value. Consumers of these contracts land in later phases.

### Import boundaries
`scripts/check-imports.ts` R3 already enforces module isolation — `catalog` exports only through `index.ts`; no other module imports catalog internals.

## 3. Security verification (executed after migration)

- `has_anon = false` on all new SECURITY DEFINER functions.
- RLS enabled on every new table; policies scoped via `is_org_member` / `has_org_permission`.
- Anonymous SELECT confined to `catalog_products` rows with `status='approved' AND is_public=true` and safe columns only.
- Cross-tenant probe: authenticated user in org A cannot read draft/pending rows of org B.
- Storage bucket `catalog-media` is private; only signed URLs reach clients; upload MIME whitelist (`image/png|jpeg|webp|avif`) and 5 MB cap enforced in `requestMediaUploadUrl`.
- Media rows cannot be flipped to `approved` without `catalog.media.review`.

## 4. Testing

- `bunx tsgo --noEmit` (typecheck).
- `bun run build` (build gate).
- Vitest units:
  - `catalog.normalize.test.ts` — Arabic normalization parity between SQL + TS mirror.
  - `catalog.permissions.test.ts` — cross-tenant deny + role matrix.
  - `catalog.media.security.test.ts` — MIME/size rejection, review-only approval, signed-URL enforcement.
  - `catalog.events.test.ts` — event names in central catalog + payload schema round-trip.
- Import-graph guard (`scripts/check-imports.ts`) — no module leak into catalog.

## 5. Documentation

`docs/engineering/reports/PHOENIX-P4-catalog.md` covering:
- Architecture (module + DB layout, legacy `products` coexistence).
- Database changes (tables, enums, functions, triggers, indexes).
- Security model (RLS, permissions, storage, SECURITY DEFINER inventory).
- Media strategy (private bucket, signed URLs, MIME/size limits, approval workflow).
- Future AI integration (contracts + `catalog_ai_signals` seam).
- Events emitted + payload shapes.
- Migration notes: legacy `products` untouched; Phase 5+ will map SKUs to `catalog_products.id`.
- Risks: dual-catalog period, alias search cost, storage bucket privacy toggles.

## Completion gate

Stop after Phase 4. Do not begin Phase 5. Report artifacts, security results, permission model, media architecture, and risks back for approval.

## Explicit non-goals

- No changes to `public.products`, `product_gallery_images`, `product_image_overrides`, `product_classifications`.
- No inventory quantities, pricing writes, reorder logic, or marketplace ordering.
- No AI model calls — contracts and the signals table only.
- No UI beyond the module scaffold (`ui/` stays empty).
