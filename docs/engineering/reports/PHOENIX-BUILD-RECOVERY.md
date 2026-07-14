# PHOENIX BUILD RECOVERY

**Status:** COMPLETE  
**Date:** 2026-07-14

## First real build error

- **Command:** `bun run build:dev`
- **Exit:** `1`
- **Failing file:** `src/routes/_authenticated/pharmacist/invoice-upload.tsx`
- **Failing line:** `11`
- **Error class:** `tanstack-start-core:import-protection`

```text
[import-protection] Import denied in client environment
Denied by file pattern: **/server/**
Importer: src/routes/_authenticated/pharmacist/invoice-upload.tsx
Import: src/modules/invoice-intake/server/upload.functions
```

## Root cause

The invoice UI routes imported authenticated `createServerFn` modules from a path containing `/server/`:

```text
src/modules/invoice-intake/server/*.functions.ts
```

TanStack Start blocks any client-reachable import that resolves through `**/server/**`, even when the target file is a server-function RPC wrapper.

## Minimal fix

Moved the invoice server-function wrappers out of the blocked folder without changing their business logic:

```text
src/modules/invoice-intake/server/*.functions.ts
→ src/modules/invoice-intake/functions/*.functions.ts
```

Updated the import paths in:

- `src/modules/invoice-intake/index.ts`
- `src/routes/_authenticated/pharmacist/invoice-upload.tsx`
- `src/routes/_authenticated/pharmacist/invoice-review.$id.tsx`
- `src/routes/_authenticated/pharmacist/invoice-list.tsx`

## Additional build blockers fixed before completion

1. **Typed route search requirement**
   - **File:** `src/routes/sahtak.tsx`
   - **Line:** `53`
   - **Root cause:** `<Link to="/doctors">` omitted required search params for the `/doctors` route.
   - **Fix:** added `search={{}}`.

2. **Route tree hygiene warning**
   - **File:** `src/routes/trust.test.tsx`
   - **Root cause:** test file lived inside route discovery and did not export `Route`.
   - **Fix:** renamed to `src/routes/-trust.test.tsx` so the route plugin ignores it.

3. **Layer boundary guard violations**
   - **File:** `src/modules/visitor/components/UnifiedSearch.tsx`
   - **Lines:** `4–5`
   - **Root cause:** visitor module imported internal domain files from doctors/catalog modules.
   - **Fix:** imported normalization utilities through public module indexes and exported `normalizeMedicineQuery` from `src/modules/catalog/index.ts`.

## Verification

```text
bun run build:dev
BUILD_EXIT=0

bunx tsgo --noEmit
TYPECHECK_EXIT=0

bun run scripts/check-imports.ts
IMPORT_GUARD_EXIT=0
✅ SEC-P1-004: scanned 508 client-reachable files — 0 violations.
✅ PHOENIX-P2: scanned 635 files — 0 layer violations.
```

## Completion criteria

- `build:dev` exits `0`: **PASS**
- Typecheck passes: **PASS**
- No server/client boundary violations: **PASS**
- No duplicate route errors: **PASS**
- No unresolved imports: **PASS**
