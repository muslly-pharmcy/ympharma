# Phoenix P7-A — Product Intelligence Foundation

**Status:** Shipped · Additive-only · Build green · 17/17 tests pass

## Files added

```
src/modules/product-intelligence/
  index.ts
  domain/
    normalize.ts          # Arabic + Latin normalization, tokenize, canonicalQuery
    aliases.ts            # buildAliasCandidates, scoreMatch, compareHits
    schemas.ts            # zod: SearchQuery, Normalization, Alias, VerifyAlias
    types.ts              # ProductAlias, ProductMediaRef, SearchHit, MatchKind
  data/
    queries.ts            # re-exports of server fns
  server/
    normalization.functions.ts   # normalizeQuery (public, pure)
    aliases.functions.ts         # listAliases / addAlias / verifyAlias (auth)
    intelligence.functions.ts    # searchMedicinesIntelligent (public)
  events/
    schemas.ts            # alias.created / alias.verified / media.verified
  ui/
    ProductImage.tsx      # lazy WebP <picture>, verified badge, placeholder
    index.ts
  __tests__/
    normalize.test.ts
    aliases.test.ts
    invalid-input.test.ts
```

## Database additions

Additive only — no table changes. One new read-only RPC:

- `public.search_medicines_public(_q text, _limit int) → SETOF search hits`
  - `SECURITY DEFINER`, `SET search_path = public`, `STABLE`
  - Ranks: `exact` → `alias` → `fuzzy` (trigram on name_ar/en/generic) → `alias_fuzzy`
  - Scoped to `catalog_products WHERE is_public AND status = 'approved'`
  - `GRANT EXECUTE ... TO anon, authenticated, service_role`

Reuses existing infrastructure:
- `catalog_product_aliases` (already has `alias_normalized` + GIN trigram index)
- `catalog_product_media` (already has `kind` / `status` / `sort_order`)
- `public.catalog_normalize_ar()` for server-side Arabic folding

## Search improvements

| Query (visitor) | Before (exact only) | After (P7-A) |
|---|---|---|
| `فتمين سي` | ∅ | Vitamin C products via alias + fuzzy fallback |
| `بنادول` | brand text match only | canonical `panadol` + alias hits + fuzzy |
| `vit c` | ∅ | folded to `vitamin_c` + alias trigram |
| `اومبرازول` | ∅ | matches `omeprazole` products |

Client normalization is available synchronously via `canonicalQuery()`; server fallback uses trigram similarity so unseen misspellings still resolve.

## Security

- Public RPC exposes only marketing-safe columns from approved public products.
- All alias writes go through `requireSupabaseAuth` server functions; existing RLS on `catalog_product_aliases` enforces org membership.
- No new tables → no new attack surface.
- `SUPABASE_SERVICE_ROLE_KEY` untouched; server publishable client used for public search.

## Performance

- Domain layer is dependency-free (~4 KB); tree-shakes into any bundle.
- `ProductImage` and server-fn RPC call sites are lazy-imported by consumers.
- Homepage bundle unaffected — no imports added to `src/routes/index.tsx`.

## Test results

```
Test Files  3 passed (3)
Tests       17 passed (17)
```

Covers: Arabic letter folding, tashkeel/tatweel/zero-width/RTL-marks stripping, whitespace collapse, mixed-script, bigram folding (`vit c → vitamin_c`), Panadol/Vitamin variant clustering, hit ranking (`exact > alias > fuzzy`), score clamping to [0,1], very long inputs, emoji/punctuation stripping, null/empty guards.

## Build status

- `bunx vitest run src/modules/product-intelligence` — 17 pass
- `bunx tsgo --noEmit` — no errors in the new module

## Non-goals (intentionally deferred)

- `/products` route wiring — existing `useSmartSearch` flow left untouched to avoid business-flow drift; consumers can call `searchMedicinesIntelligent` when ready.
- AI-generated alias mining — event schemas prepared, no producer yet.
- Image CDN transformer — `ProductImage` already supports `<source type="image/webp">` when the caller passes a WebP variant URL.
