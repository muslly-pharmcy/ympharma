## Build Stability Gate — Investigation Complete

### Current build state
`rm -rf dist && bun run build:dev` **exits 0**. The stderr you pasted is stale (from before the SheetJS pre-flight fix). Zero TypeScript, Vite plugin, TanStack route generation, or import resolution errors. Phase 1 tenancy modules (`src/platform/tenant-context/**`) resolve cleanly, no boundary violations.

### Bundle finding — one real cleanup opportunity
The clean build reveals a duplicate xlsx dependency in both client and server bundles:

- `dist/client/assets/xlsx-Cl_0CZaL.js` — **493 KB** (client)
- `dist/server/_libs/xlsx.mjs` — **841 KB** (server)
- `dist/server/_libs/e965__xlsx.mjs` — **621 KB** (server, the intended one)

Root cause: `src/routes/admin-ai-excel-import.tsx` still dynamically imports the bare `"xlsx"` package (lines 7–9, 220), which resolves to a transitive `node_modules/xlsx` copy. The rest of the codebase uses `@e965/xlsx`. So we ship SheetJS twice.

Top 10 client bundles (post-clean build):
```
1147 KB  index-*.js
1141 KB  routes-*.js
 881 KB  use-merged-products-*.js
 493 KB  xlsx-*.js              ← duplicate, removable
 386 KB  BarChart-*.js
 385 KB  admin-upload-inventory-*.js
  86 KB  PrescriptionsTab-*.js
  57 KB  admin-social-posts-*.js
  45 KB  admin-command-*.js
  44 KB  admin-*.js
```

### Planned changes (source-only, no dep/DB/migration changes)

1. **Fix duplicate xlsx** in `src/routes/admin-ai-excel-import.tsx`:
   - Replace 3 references to bare `"xlsx"` with `"@e965/xlsx"` (type alias, dynamic import, and inline mention).
   - Eliminates ~493 KB client chunk and the 841 KB server duplicate.
2. **Verify** with `rm -rf dist && bun run build:dev` and re-list top bundles.
3. **Deliver** `docs/engineering/reports/PHOENIX-BUILD-STABILITY.md` with: root cause of the stale stderr (SheetJS CDN 403, already fixed pre-flight), current build status, xlsx dedup fix, before/after bundle table, and untouched-areas note.

### Not doing (per restrictions)
- No dep upgrades, no lockfile changes (the transitive `xlsx` copy stays until whichever parent no longer needs it — Vite just won't emit it into our bundles after this change).
- No DB / migration / Phase 2 work.
- No refactor of `use-merged-products` (881 KB) or `BarChart` (386 KB); flagged in the report as follow-up candidates for a future perf pass, not fixed now.

Stopping after build is verified stable.