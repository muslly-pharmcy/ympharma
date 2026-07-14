# PHOENIX-PRE-FLIGHT — Replace SheetJS CDN Tarball

**Status:** DONE
**Date:** 2026-07-14

## Root cause

`package.json` pinned `xlsx` to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` in three places (`dependencies`, `overrides`, `resolutions`). The SheetJS CDN now returns HTTP 403 on anonymous tarball fetches, so any cold `bun install` (cache miss, fresh sandbox) fails:

```
error: GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz - 403
```

The registry-hosted `xlsx` package is stuck at `0.18.5` (SheetJS moved 0.20.x off npm). The minimum-drift fix is to swap to `@e965/xlsx`, the community npm mirror that tracks 0.20.x with a byte-compatible API.

## Files changed

- `package.json`
  - Removed `dependencies.xlsx` CDN pin → added `"@e965/xlsx": "^0.20.3"`.
  - Removed `overrides.xlsx` and `resolutions.xlsx` entries (no longer needed; kept `htmlparser2` override).
- `src/lib/products-admin.functions.ts` — `from "xlsx"` → `from "@e965/xlsx"`.
- `src/routes/_authenticated/admin-upload-inventory.tsx` — same import swap.
- `bun.lock` — regenerated. Old file preserved at `bun.lock.backup`.

No other source files touched.

## Dependency change

| Before | After |
|---|---|
| `xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | `@e965/xlsx@^0.20.3` (resolved `0.20.3` from `registry.npmjs.org`) |

API surface identical (`XLSX.read`, `XLSX.utils.sheet_to_json`, `XLSX.write`, etc.) — no code changes required beyond the import path.

## Verification

```
$ bun install
+ @e965/xlsx@0.20.3
3 packages installed [2.30s]
Exit code: 0

$ bunx tsgo --noEmit
(no output — 0 errors)
```

- `bun install` succeeds cold, tarball fetched from npm registry, not the CDN.
- TypeScript typecheck passes across the whole project.
- No unrelated packages upgraded (only `xlsx` removed, `@e965/xlsx` added).

## Rollback

```
mv bun.lock.backup bun.lock
git checkout package.json src/lib/products-admin.functions.ts src/routes/_authenticated/admin-upload-inventory.tsx
bun install
```

## Out of scope (per directive)

No DB migrations, route changes, UI changes, or Phoenix Phase 1 work. Preflight only.
