# Phoenix Phase 4 — Catalog & Media Library

**Status:** ✅ CLOSED
**Scope:** National medicine catalog + media library foundation. No inventory quantities, no marketplace ordering — those are later phases.

## 1. Architecture

```text
src/modules/catalog/
├── README.md
├── index.ts                    # public barrel — only entry point
├── domain/
│   ├── types.ts                # CatalogProduct, CatalogAlias, CatalogMedia, SearchHit
│   ├── schemas.ts              # Zod: create/update/alias/search/media
│   ├── normalize.ts            # normalizeAr — TS mirror of SQL immutable helper
│   └── aiContract.ts           # OCR / barcode / image / invoice / prescription contracts
├── events/schemas.ts           # PRODUCT_* payload schema + name union
└── server/
    ├── catalog.functions.ts    # list/get/create/update/status transitions/aliases/search/barcode
    └── media.functions.ts      # signed upload URL + register + review
```

The module is parallel to the legacy commerce `public.products` table. It uses only Phase 2/3 primitives (event bus, `PermissionService`, tenant context).

## 2. Database Changes

New tables (all in `public`, all RLS-enabled, all GRANTed):

| Table | Purpose |
|---|---|
| `catalog_categories` | Hierarchical taxonomy |
| `catalog_products` | Medicines, medical supplies, healthcare products |
| `catalog_product_aliases` | AR/EN spelling variants, OCR/AI-sourced synonyms |
| `catalog_product_media` | Images (primary/gallery/thumbnail/barcode) with review workflow |
| `catalog_barcodes` | Multiple barcodes per product (EAN/UPC/GTIN/QR) |
| `catalog_ai_signals` | AI integration seam — restricted to `service_role` |

New immutable helper: `public.catalog_normalize_ar(text)` — pure SQL, strips tashkeel, unifies alef/ya/ta-marbuta/hamza, removes tatweel. Mirrored by `src/modules/catalog/domain/normalize.ts`.

New RPC: `public.catalog_search(_q, _org_id, _limit)` — pg_trgm-backed search across product names, generic, brand, and aliases; returns ranked hits.

Triggers emit `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_VERIFIED`, `PRODUCT_IMAGE_ADDED` into `agent_events` (Phase 2 bus) and `organization_audit_events`.

## 3. Security Model

**RLS** on catalog tables:
- Public (`anon` + `authenticated`) may read `catalog_products` where `status = 'approved' AND is_public = true`.
- Org members may read all of their org's rows.
- Writes require org membership + `catalog.write` (via `has_org_permission`).
- Verification transitions require `catalog.verify`.
- Media upload/review require `catalog.media.upload` / `catalog.media.review`.
- `catalog_ai_signals` is `service_role` only.

**Storage** — private bucket `catalog-media`. Policies on `storage.objects`:
- INSERT allowed only when `name` starts with `<product_id>/…` **and** caller has `catalog.media.upload` on that product's org.
- SELECT allowed to org members of the product's org.
- DELETE requires `catalog.write`.
Client reads always go through signed URLs; no public bucket exposure.

**Permission seed** — 5 new permission keys inserted into `public.permissions`:
- `catalog.read` → all org roles
- `catalog.write` → Owner, Admin, Manager, Pharmacist
- `catalog.verify` → Owner, Admin
- `catalog.media.upload` → Owner, Admin, Manager, Pharmacist
- `catalog.media.review` → Owner, Admin

## 4. Media Strategy

- Upload flow: client calls `requestMediaUploadUrl` → server verifies perm + MIME + size, returns Supabase `createSignedUploadUrl` token → client PUTs blob → client calls `registerUploadedMedia` → row lands as `status='pending'`.
- Reviewer runs `reviewMedia` → sets `approved` / `rejected` with reviewer + timestamp.
- Constraints enforced server-side: MIME ∈ {png, jpeg, webp, avif}, ≤ 5 MB.
- Kinds: `primary`, `gallery`, `thumbnail`, `barcode`. Optimization/CDN transforms are downstream concerns (later phase).

## 5. Future AI Integration

`domain/aiContract.ts` freezes I/O shapes for:
- OCR extraction (`OcrExtractionInput` / `OcrExtractionResult`)
- Barcode recognition
- Image recognition (candidate matching)
- Invoice parsing
- Prescription parsing

Handlers (Phase 5+) persist outputs into `catalog_ai_signals` keyed by product/media + signal type + confidence + model version. No model calls in this phase.

## 6. Search Foundation

`searchCatalog({ orgId?, q, limit })` calls `public.catalog_search` — pg_trgm ranked across product `name_ar`/`name_en`/`generic_name`/`brand` and all aliases, using Arabic-normalized keys. `lookupByBarcode({ barcode })` reads from `catalog_barcodes`.

## 7. Events

Emitted through DB triggers (single source of truth — clients cannot bypass):
- `PRODUCT_CREATED` — on insert
- `PRODUCT_UPDATED` — on any column change
- `PRODUCT_VERIFIED` — on status → `approved`
- `PRODUCT_IMAGE_ADDED` — on media insert

Payload shape validated by `CatalogEventPayload` in `events/schemas.ts`.

## 8. Testing & Verification

- Typecheck: green.
- Build: green (no changes to Vite/SSR config).
- Migration linter: 137 pre-existing warnings (all inherited from earlier phases — legacy `search_path` + extension-in-public findings tracked separately). No new warnings introduced by Phase 4 objects — every new function is `SET search_path = public` and revoked from `anon` where privileged.

## 9. Completion Gate

Phase 4 CLOSED. Ready for Phase 5 authorization.
