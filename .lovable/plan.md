
# Phoenix Phase 7-A — Product Intelligence Foundation

Additive-only. Reuses existing `catalog_product_aliases` and `catalog_product_media` tables (already in the DB with `alias_normalized` + trigram index and media `status`/`kind`), and layers a dedicated intelligence module on top of catalog.

## 1. New module scaffold — `src/modules/product-intelligence/`

```text
product-intelligence/
  domain/
    types.ts              # ProductAlias, ProductMediaRef, SearchHit, MatchKind
    schemas.ts            # zod: SearchQuery, AliasInput, NormalizationInput
    normalize.ts          # Arabic + Latin normalization (single source of truth)
    aliases.ts            # buildAliasCandidates(query), scoreMatch()
  data/
    queries.ts            # publishable-key SSR reads (public search only)
  server/
    normalization.functions.ts   # normalizeQuery({query})
    aliases.functions.ts         # addAlias / listAliases / verifyAlias (authenticated)
    intelligence.functions.ts    # searchMedicinesIntelligent({query, limit})
  events/
    schemas.ts            # alias.created / alias.verified / media.verified event zods
  ui/
    ProductImage.tsx      # lazy, WebP-first, placeholder fallback, verification badge
    index.ts
  index.ts                # barrel: re-exports domain + ui only (no server)
```

Server files stay outside `src/server/` (import-protection rule). `ui/` is lazy-imported so nothing enters the homepage bundle.

## 2. Normalization engine (`domain/normalize.ts`)

Pure functions, no deps. Behaviour:
- Arabic letter folding: `أ إ آ ٱ → ا`, `ى → ي`, `ة → ه`, `ؤ → و`, `ئ → ي`.
- Strip tatweel `ـ`, tashkeel (`\u064B-\u0652`), zero-width chars.
- Lowercase Latin, collapse whitespace, strip punctuation.
- `normalize(query)` → canonical string.
- `tokenize(query)` → tokens after canonical-map + bigram merge (reuses the maps already in `src/modules/catalog/domain/medicineNormalize.ts`, which is re-exported from here — old imports keep working).

## 3. Alias engine (`domain/aliases.ts`)

- `buildAliasCandidates(query)` → `{ exact, normalized, tokens, bigrams }`.
- `scoreMatch(hit, query)` → 0..1 (exact > normalized > alias-hit > trigram distance).
- Prepares for fuzzy: exposes normalized form for `pg_trgm` similarity server-side.

## 4. Data layer (no schema changes)

DB already has everything needed:
- `catalog_product_aliases(product_id, alias, alias_normalized, locale, source, confidence)` with GIN trigram on `alias_normalized`.
- `catalog_product_media(product_id, storage_bucket, storage_path, kind, status, mime, width, height, sort_order)`.

No migration. If a helper RPC is missing for public trigram search, add ONE `SECURITY DEFINER` function `search_medicines_intelligent(_q text, _limit int)` in a small additive migration — read-only, `GRANT EXECUTE TO anon, authenticated`, respects `is_public AND status='approved'`. Only added if the same query cannot be expressed with existing PostgREST filters at acceptable perf.

## 5. Server functions

- `normalizeQuery` — pure, no auth, returns normalized + tokens (used by the UI for highlighting).
- `searchMedicinesIntelligent` — publishable-key server client; joins `catalog_products` + `catalog_product_aliases` on normalized match / trigram; returns products with primary approved media URL; ranks by match kind then similarity.
- `addAlias` / `verifyAlias` — `requireSupabaseAuth`; RLS on `catalog_product_aliases` already enforces org membership; writes audit row into existing `identity_audit_events` or `organization_audit_events` (whichever fits; no new table).

## 6. Public search upgrade

Wire `src/modules/visitor/components/UnifiedSearch.tsx` medicine branch to call `searchMedicinesIntelligent` instead of the current exact-match path. Keeps existing UI and analytics events. Behaviour:
- exact match → normalized match → alias match → trigram fallback.
- "فتمين سي" → returns Vitamin C products.

## 7. Product image foundation — `ui/ProductImage.tsx`

- Accepts `productId` + optional `mediaId`.
- Picks primary approved media (`kind='primary'` or lowest `sort_order` with `status='approved'`).
- `<img loading="lazy" decoding="async">`, `srcset` with WebP variant when `mime='image/webp'`, otherwise original.
- Placeholder SVG fallback on error / missing.
- Small `VerifiedBadge` when `status='approved'`.
- Zero impact on homepage bundle — imported only inside lazy visitor sections.

## 8. Security

- No new tables (or one additive read-only RPC). Existing RLS preserved.
- All writes go through `requireSupabaseAuth` server functions.
- Public search uses publishable-key SSR client + existing `TO anon` SELECT policy.
- Audit alias verification via existing audit table.

## 9. Tests — `src/modules/product-intelligence/__tests__/`

Vitest, pure functions only:
- `normalize.test.ts` — Arabic folding, tashkeel strip, whitespace, mixed-script.
- `aliases.test.ts` — "فتمين", "فتامين", "vit c" → same canonical bucket as "vitamin c".
- `search-ranking.test.ts` — exact > normalized > alias > trigram ordering.
- `invalid-input.test.ts` — empty, whitespace-only, extremely long, RTL control chars, emoji.

## 10. Performance

- Module tree-shaken; only `domain/normalize.ts` (~2KB) reaches the client from search.
- `ProductImage` and `searchMedicinesIntelligent` are lazy-imported.
- Homepage bundle size verified unchanged (± noise) via `bun run build` output.

## 11. Deliverable

Single short report at `docs/engineering/reports/PHOENIX-P7A-product-intelligence.md`:
- files added, DB additions (0 or 1 RPC), search behaviour before/after, vitest results, build status.

## Non-goals (explicitly out)

- No changes to inventory, orders, prescriptions, admin dashboards.
- No new tables for aliases/media (reuse existing).
- No AI-generated aliases in this phase (event schemas prepared for later).
- No image transformer route — CDN/WebP variant only if already produced upstream.
