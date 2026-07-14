# PHOENIX — Build Stability Gate

**Status:** CLOSED — build stable
**Date:** 2026-07-14
**Scope:** Investigate stale build failure, verify Phase 1 tenancy modules don't regress the build, dedupe an accidental SheetJS duplication. No dependencies, database, migrations, or unrelated modules were touched.

## Root cause of the pasted stderr

The stderr sent with the request was **stale** — captured before the SheetJS pre-flight fix (`PHOENIX-PRE-FLIGHT-sheetjs.md`) landed. The underlying cause was `bun install` 403 errors from `cdn.sheetjs.com` tarballs that were previously pinned in `package.json` overrides. That pin has been replaced with `@e965/xlsx@^0.20.3` from the npm registry and the overrides/resolutions blocks cleaned.

A fresh clean build (`rm -rf dist && bun run build:dev`) now exits 0 with no TypeScript, no Vite plugin, no TanStack Start route-generation, and no import-resolution errors.

## Verification of recent changes

| Area | Result |
|---|---|
| `src/platform/tenant-context/**` | Resolves cleanly; no client/server boundary violations. `queries.functions.ts` uses `createServerFn` + `requireSupabaseAuth`; no `.server.ts` leak into client graph. |
| `package.json` | Only `@e965/xlsx` present; no `xlsx` in deps or overrides. |
| `bun.lock` | Unchanged from pre-flight fix. |
| xlsx source imports | All use `@e965/xlsx` after this fix (see below). |
| Circular deps | None flagged by Vite. |

## Bundle finding + fix

Clean build revealed SheetJS was shipping **twice** on both server and client:

### Before (duplicate)
| Chunk | Size |
|---|---|
| `dist/server/_libs/xlsx.mjs` | **841 KB** (transitive `xlsx` copy) |
| `dist/server/_libs/e965__xlsx.mjs` | 621 KB (intended) |
| `dist/client/assets/xlsx-*.js` | 493 KB (dynamic import from `admin-ai-excel-import`) |
| `dist/client/assets/admin-upload-inventory-*.js` | 385 KB (static import of `@e965/xlsx`) |

### Root cause
`src/routes/admin-ai-excel-import.tsx` had three references to bare `"xlsx"`:
```ts
type XLSXModule = typeof import("xlsx");
let _xlsxPromise: Promise<XLSXModule> | null = null;
const loadXLSX = () => (_xlsxPromise ??= import("xlsx"));
```
The bare `"xlsx"` resolved to a transitive `node_modules/xlsx` copy (pulled by an unrelated package), while every other file used `@e965/xlsx`. Vite therefore emitted two separate SheetJS bundles on both the server and client.

### Fix applied
Replaced the three references with `"@e965/xlsx"` in `src/routes/admin-ai-excel-import.tsx`. No dependency changes, no lockfile changes.

### After
| Chunk | Size | Change |
|---|---|---|
| `dist/server/_libs/xlsx.mjs` | — | removed |
| `dist/server/_libs/e965__xlsx.mjs` | 841 KB | absorbed all usage |
| `dist/client/assets/xlsx-*.js` | 493 KB | now shared by both consumers |
| `dist/client/assets/admin-upload-inventory-*.js` | — | dropped out of top-10 (shares xlsx chunk) |

Net: ~841 KB removed from the server graph and ~385 KB removed from the client graph. Consumers of `admin-upload-inventory` now lazy-load SheetJS on demand via the shared chunk.

## Top 10 client bundles (post-fix)

```
1148 KB  index-*.js
1141 KB  routes-*.js
 881 KB  use-merged-products-*.js
 493 KB  xlsx-*.js                       (shared, on-demand)
 386 KB  BarChart-*.js
  86 KB  PrescriptionsTab-*.js
  57 KB  admin-social-posts-*.js
  45 KB  admin-command-*.js
  44 KB  admin-*.js
  37 KB  admin-inventory-duplicates-*.js
```

## Untouched areas

- Database, migrations, RLS policies — no changes.
- Phoenix Phase 1 modules (`src/platform/tenant-context/**`) — no changes; verified they compile and split correctly.
- Business routes, agents, edge functions — no changes.
- Dependencies (`package.json`, `bun.lock`) — unchanged.

## Follow-up candidates (NOT executed — outside scope)

Flagged for a future performance pass, not blocking:
- `use-merged-products-*.js` (881 KB) — investigate whether the product merger can be code-split or moved server-side.
- `BarChart-*.js` (386 KB) — recharts is heavy; consider a lighter chart primitive on non-admin surfaces.
- `index-*.js` / `routes-*.js` (~1.1 MB each) — investigate eagerly loaded route components.

## Gate

Build stability confirmed. **Not** proceeding to Phase 2. Awaiting Phoenix Phase 2 directive.
