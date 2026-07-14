# Catalog Module (Phoenix Phase 4)

National medicine catalog + media library foundation. Parallel to the legacy `public.products` commerce table — no inventory quantities, no marketplace ordering.

## Public API

Import only from `@/modules/catalog` (barrel). Everything else is internal.

- `listCatalogProducts`, `getCatalogProduct`, `searchCatalog`, `lookupByBarcode`
- `createCatalogProduct`, `updateCatalogProduct`, `submitForReview`, `verifyCatalogProduct`, `rejectCatalogProduct`
- `addProductAlias`
- `requestMediaUploadUrl`, `registerUploadedMedia`, `reviewMedia`
- Types + Zod schemas from `domain/`
- AI integration contracts from `domain/aiContract.ts` (no models yet)

## Permissions

`catalog.read`, `catalog.write`, `catalog.verify`, `catalog.media.upload`, `catalog.media.review` — enforced via `PermissionService` (Phase 3).

## Events

Emits `PRODUCT_CREATED · PRODUCT_UPDATED · PRODUCT_VERIFIED · PRODUCT_IMAGE_ADDED` through DB triggers into `agent_events` (Phase 2 bus) + `organization_audit_events`.
