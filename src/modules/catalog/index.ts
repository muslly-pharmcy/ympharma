// Phoenix Phase 4 — Catalog module public surface.
export * from "./domain/types";
export {
  CreateProductSchema,
  UpdateProductSchema,
  AliasSchema,
  SearchInputSchema,
  BarcodeLookupSchema,
  RequestUploadUrlSchema,
  RegisterMediaSchema,
  ReviewMediaSchema,
  ALLOWED_MIME,
  MAX_MEDIA_BYTES,
} from "./domain/schemas";
export { normalizeAr } from "./domain/normalize";
export { normalizeMedicineQuery, medicineSearchTerms } from "./domain/medicineNormalize";
export { CATALOG_EVENTS, CatalogEventPayload, type CatalogEventName } from "./events/schemas";
export * as aiContract from "./domain/aiContract";
export {
  listCatalogProducts,
  getCatalogProduct,
  createCatalogProduct,
  updateCatalogProduct,
  submitForReview,
  verifyCatalogProduct,
  rejectCatalogProduct,
  addProductAlias,
  searchCatalog,
  lookupByBarcode,
} from "./server/catalog.functions";
export {
  requestMediaUploadUrl,
  registerUploadedMedia,
  reviewMedia,
} from "./server/media.functions";
