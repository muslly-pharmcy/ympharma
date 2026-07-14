# Phoenix Product Intelligence — Consolidated Report

**Status:** Shipped · Additive-only · 24/24 tests pass
**Supersedes filename:** `PHOENIX-P7A-product-intelligence.md` (kept in place for history)

This document consolidates the Product Intelligence Foundation built in Phase 7-A with the Lite extension pass requested afterward. Nothing here is destructive — no table drops, no policy weakening, no route rewrites.

## 1. Arabic medicine normalization

`src/modules/product-intelligence/domain/normalize.ts` is the single source of truth. Pure, dependency-free, mirrors `public.catalog_normalize_ar` in SQL.

- Strips tashkeel, tatweel, zero-width, RTL control marks, punctuation, emoji.
- Folds letter variants: `أإآٱ→ا`, `ى→ي`, `ة→ه`, `ؤ→و`, `ئ→ي`.
- Collapses whitespace, lowercases Latin.

Examples (all covered by tests):

| Input | `canonicalQuery` |
|---|---|
| فتمين / فتامين / فيتامين / ڤيتامين / Vitamin | `vitamin` |
| بنادول / باندول / بندول / بانادول / Panadol | `panadol` |
| فتمين سي | `vitamin_c` |
| vit b | `vitamin_b` |
| Vit سي | `vit سي` (mixed-script preserved) |
| \u202Eفيتامين\u202C | `فيتامين` |

## 2. Alias engine

Runtime dictionary in `normalize.ts` (`CANONICAL_MAP` + `BIGRAM_MAP`) — expanded in the Lite pass to ~90 curated variants covering:

- Analgesics: paracetamol, ibuprofen, brufen, aspirin, diclofenac/voltaren, cataflam
- Antibiotics: amoxicillin, augmentin, azithromycin/zithromax, ciprofloxacin, clarithromycin, metronidazole/flagyl
- GI: omeprazole, pantoprazole, esomeprazole/nexium, ranitidine/zantac, maalox, gaviscon, domperidone/motilium
- Cardio / diabetes: insulin, metformin/glucophage, gliclazide, glimepiride, atorvastatin/lipitor, simvastatin, rosuvastatin/crestor, amlodipine/norvasc, bisoprolol/concor, valsartan, losartan/cozaar, enalapril, captopril, ramipril
- Respiratory / allergy: ventolin/salbutamol, cetirizine/zyrtec, loratadine/claritin, mucosolvan
- Supplements: zinc, iron/ferrous, calcium, magnesium, omega, probiotic, folic, multi

Persistent per-product aliases live in `catalog_product_aliases` (already had `alias_normalized` + GIN trigram index). Server functions:

- `listAliases({ productId })` — authed
- `addAlias({ productId, alias, locale, source, confidence })` — authed, writes `alias_normalized` via `normalize()`
- `verifyAlias({ aliasId, confidence })` — authed

Confidence score is a `number in [0,1]`, validated by zod (`AliasInputSchema`, `VerifyAliasSchema`).

## 3. Search priority

`public.search_medicines_public(_q, _limit)` RPC — `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, granted to `anon, authenticated, service_role`. Scoped to `catalog_products WHERE is_public AND status = 'approved'`.

Server ranks the union of matches. Client resorts defensively via `compareHits`:

```
exact  >  normalized  >  alias  >  fuzzy  >  alias_fuzzy
```

Within a kind, higher `score` wins. `scoreMatch(kind, similarity)` clamps to `[0,1]`.

**Client wiring (Lite pass):** `src/hooks/use-intelligent-search.ts` provides `useIntelligentSearch(query, limit)` — debounced 250 ms, returns `{ hits, loading, canonical }`. Consumers can adopt it incrementally without touching the existing `useSmartSearch` flow.

## 4. Product media foundation

Reuses `catalog_product_media` — no schema change:
- `kind` (image, video, doc), `status` (pending/approved/rejected), `sort_order`, `source`, `verified_at`.
- Storage buckets from Phase 4 remain the write path.

UI: `src/modules/product-intelligence/ui/ProductImage.tsx`
- `<picture>` with `<source type="image/webp">` when a WebP URL is passed.
- Lazy loading (`loading="lazy"`, `decoding="async"`).
- Placeholder fallback when `src` is missing/broken.
- Verified badge overlay when `verified` prop is true.

## 5. Prepared for OCR / barcode / prescription AI

- **Barcode:** `catalog_barcodes` + `lookupByBarcode` from the catalog module — search RPC can be chained after a barcode miss.
- **OCR / prescription AI:** the alias engine accepts any text; OCR pipelines can push extracted tokens through `canonicalQuery()` before matching, and confirmed hits can be persisted via `addAlias({ source: 'ocr' | 'prescription_ai', confidence })`.
- **Event contracts:** `src/modules/product-intelligence/events/schemas.ts` defines `alias.created`, `alias.verified`, `media.verified` for future consumers.

## Security

- Public RPC returns only marketing-safe columns from approved public products; RLS on `catalog_products` unchanged.
- All alias writes go through `requireSupabaseAuth`; existing RLS on `catalog_product_aliases` enforces org membership.
- No new tables → no new attack surface.
- Server publishable client (not `supabaseAdmin`) used for the public search path; `sb_`-key `Authorization` header stripped per project convention.

## Tests

```
Test Files  4 passed (4)
Tests      24 passed (24)
```

Coverage:
- Normalization: Arabic folding, tashkeel/tatweel/zero-width/RTL stripping, whitespace, mixed script, empty/null.
- Aliases: candidate building, Panadol/Vitamin clustering, empty input, expanded chronic/cardio/respiratory brand map, voltaren misspellings.
- Ranking: exact > alias > fuzzy, tie-breakers within a kind, normalized > alias, mixed-script exact beats fuzzy, score clamping.
- Edge cases: very long inputs (~500 tokens), emoji/punctuation, RTL control marks, null/undefined.

## Files touched in the Lite pass

```
M  src/modules/product-intelligence/domain/normalize.ts      # expanded CANONICAL_MAP
A  src/modules/product-intelligence/__tests__/ranking-extra.test.ts
A  src/hooks/use-intelligent-search.ts                        # opt-in client hook
A  docs/engineering/reports/PHOENIX-PRODUCT-INTELLIGENCE.md   # this file
```

No database migrations. No route changes. Existing `useSmartSearch` untouched.
