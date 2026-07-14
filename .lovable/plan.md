## Phoenix Pre-Flight — Replace SheetJS CDN Tarball

Fix intermittent `bun install` 403 caused by `xlsx` pinned to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` in three places: `dependencies`, `overrides.xlsx`, `resolutions.xlsx`.

### Root cause

SheetJS no longer serves anonymous downloads of the 0.20.x tarball reliably; the CDN returns 403 on installs. The lockfile regeneration in the previous turn succeeded once, but any future install that has to refetch the tarball (cache miss, cold sandbox) will fail again. The dependency must resolve from the npm registry, not the CDN.

### Package choice

Use `@e965/xlsx` at `^0.20.3` — the npm-registry mirror of SheetJS 0.20.x, byte-compatible API (`import * as XLSX from "@e965/xlsx"`). The registry-hosted `xlsx@0.18.5` is far older and drops features the code may rely on; `@e965/xlsx` is the minimum-drift swap.

### Changes

1. `package.json`
   - `dependencies.xlsx` → replace with `"@e965/xlsx": "^0.20.3"`; remove the `xlsx` entry.
   - `overrides.xlsx` → remove.
   - `resolutions.xlsx` → remove.

2. Update the two import sites to use the new package name:
   - `src/lib/products-admin.functions.ts`
   - `src/routes/_authenticated/admin-upload-inventory.tsx`

   Change `from "xlsx"` → `from "@e965/xlsx"`. No API changes.

3. Lockfile regeneration:
   - Back up: `cp bun.lock bun.lock.backup` (only `bun.lock` exists; no `bun.lockb`).
   - `rm -f bun.lock bun.lockb && bun install`.

### Verification

- `bun install` exits 0, tarball fetched from `registry.npmjs.org`, not `cdn.sheetjs.com`.
- `bunx tsgo --noEmit` passes for both edited files.
- No other package versions change (diff `bun.lock` before/after — only `xlsx` block removed, `@e965/xlsx` block added).

### Documentation

Create `docs/engineering/reports/PHOENIX-PRE-FLIGHT-sheetjs.md` covering root cause, files changed, dependency swap rationale (`@e965/xlsx` vs stale registry `xlsx@0.18.5`), and install/typecheck output.

### Out of scope

No DB, migrations, routes, UI, or Phoenix Phase 1 work. Stops after dependency install succeeds and typecheck passes.
