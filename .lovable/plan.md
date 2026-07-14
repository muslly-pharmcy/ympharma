## Status: Already Shipped (Phoenix P7-A)

Everything in this directive was implemented and reported in the previous "Phoenix Phase 7-A — Product Intelligence Foundation" turn. Re-running it would only rewrite the same files.

### Current coverage vs. request

| Requirement | Existing artifact |
|---|---|
| Arabic normalization (فتمين/فتامين/فيتامين → vitamin, بنادول/باندول → panadol) | `src/modules/product-intelligence/domain/normalize.ts` (`CANONICAL_MAP`, `BIGRAM_MAP`, `normalize`, `tokenize`, `canonicalQuery`) |
| Alias engine (AR/EN, misspellings, confidence) | `catalog_product_aliases` table + `src/modules/product-intelligence/server/aliases.functions.ts` (`listAliases`, `addAlias`, `verifyAlias` with 0..1 `confidence`) |
| Search priority Exact → Normalized → Alias → Fuzzy | `public.search_medicines_public` RPC + `compareHits`/`scoreMatch` in `domain/aliases.ts` (ranks `exact`>`alias`>`fuzzy`>`alias_fuzzy`) |
| Product media (real images, verification, source, WebP) | `catalog_product_media` (kind/status/sort_order) + `src/modules/product-intelligence/ui/ProductImage.tsx` (`<picture>` WebP, verified badge, lazy) |
| Prep for OCR / barcode / prescription AI | `catalog_barcodes` table + `lookupByBarcode` in catalog module; alias engine reusable for OCR/prescription outputs |
| RLS respected | Public RPC scoped to `is_public AND status='approved'`; alias writes go through `requireSupabaseAuth`; no new tables |
| Tests (normalization, aliases, ranking) | 17 tests passing in `src/modules/product-intelligence/__tests__/` |
| Report | `docs/engineering/reports/PHOENIX-P7A-product-intelligence.md` |

### Proposed action — pick one

**A. No-op + rename report (recommended, ~0 credits)**  
Copy the existing `PHOENIX-P7A-product-intelligence.md` to `PHOENIX-PRODUCT-INTELLIGENCE.md` (the filename the directive asked for) so the deliverable exists at the expected path. Nothing else changes.

**B. Lite extension pass**  
Keep A, plus small additive upgrades that go beyond what P7-A shipped:
- Expand `CANONICAL_MAP` with a larger misspelling set (curated ~50 more AR variants for common OTC/chronic meds).
- Add `image_source` enum hint + `verified_by` display in `ProductImage` tooltip.
- Wire `searchMedicinesIntelligent` into the existing `useSmartSearch` hook behind a feature flag so the homepage search actually benefits — currently the module is available but no consumer imports it.
- Add 5–8 more ranking tests (tie-breaking, mixed-script hits).

**C. Full re-execute**  
Rewrite the module from scratch under the new report name. Not recommended — pure churn, risks regressions, no functional gain.

### Recommendation

Go with **B**. It closes the one real gap (the intelligent search RPC isn't wired to any UI yet) and delivers the report at the requested filename, without duplicating shipped work.

Reply with **A**, **B**, or **C** (or a custom scope) and I'll switch to build mode.
