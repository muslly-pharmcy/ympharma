## PHOENIX BUILD RECOVERY Plan

**Scope lock:** no feature work. Only restore a green build, typecheck, import boundary guard, and route graph.

### First observed build signal
- Current dev logs do not yet show the fatal `build:dev` stack trace, but they do show a real route hygiene issue:
  - **File:** `src/routes/trust.test.tsx`
  - **Line:** route plugin warning at route discovery, because this test file is inside `src/routes/` and does not export `Route`
  - **Root cause:** test/spec file placed in the route tree; TanStack route generator treats it as a route candidate
  - **Minimal fix:** move/rename it out of route discovery, preferably `src/routes/-trust.test.tsx` or move to `src/__tests__/...`

### Likely first fatal errors to verify/fix after running build
Based on the newly added invoice routes:
1. **Typed route navigation misuse**
   - Failing files likely:
     - `src/routes/_authenticated/pharmacist/invoice-upload.tsx`
     - `src/routes/_authenticated/pharmacist/invoice-list.tsx`
     - `src/routes/_authenticated/pharmacist/invoice-review.$id.tsx`
   - Root cause: navigation/link targets use internal route IDs (`/_authenticated/...`) instead of public URL paths (`/pharmacist/...`), currently hidden with `as never`.
   - Minimal fix: use public paths:
     - `/pharmacist/invoice-list`
     - `/pharmacist/invoice-review/$id`

2. **Server function boundary/splitting risk**
   - Failing files likely:
     - `src/modules/invoice-intake/server/extract.functions.ts`
     - `src/modules/invoice-intake/server/upload.functions.ts`
     - `src/modules/invoice-intake/server/review.functions.ts`
   - Root cause: client routes import server functions from a `server/` folder and the server-function files contain module-scope helpers/constants used inside handlers. TanStack Start can split handlers strictly; helpers used by handlers may need to be inside the handler or in a safe shared module.
   - Minimal fix: keep imports client-safe, move server-only helper usage inside handlers or into non-server-only safe modules, and ensure admin/server-only imports remain dynamic inside handlers.

### Execution steps after approval
1. Run `bun run build:dev` and capture the **first real error**, not the final stack trace.
2. Fix only that first failing file/line with the smallest patch.
3. Re-run `bun run build:dev`.
4. Repeat only for subsequent build blockers until `build:dev` exits `0`.
5. Run typecheck with `bunx tsgo --noEmit`.
6. Run import boundary guard with `bun run scripts/check-imports.ts`.
7. Check route graph issues: no duplicate routes, no route test files in `src/routes`, no unresolved imports.
8. Add/update `docs/engineering/reports/PHOENIX-BUILD-RECOVERY.md` with:
   - exact failing file
   - exact failing line
   - root cause
   - minimal fix
   - verification results

### Completion criteria
- `build:dev` exits `0`
- typecheck passes
- import guard passes
- no duplicate routes
- no unresolved imports
- report is written
