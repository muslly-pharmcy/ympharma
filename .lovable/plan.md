## Scope

Adopt the user-provided governance refresh and dispatch the next feature **CRON-P1-004** (Cron Auth Middleware) under the Engineering Execution System.

## Reality check (must be acknowledged before I execute)

1. **SEC-P1-002 Batch 2 is still `AWAITING_ITRB_VERDICT`.** The contract says only ITRB advances `PROJECT_STATE.yaml` after a PASS. Overwriting state to `CRON-P1-004 / EXECUTE` is an implicit PASS verdict on SEC-P1-002 Batch 2. I will record it as such in `CHANGELOG.md`.
2. **`CRON-P1-004` collides with the existing `SEC-P1-001`** in `plans/phase-1.yaml`, which already covers cron auth in two batches (inventory → fix). I will **add** `CRON-P1-004` alongside it rather than delete SEC-P1-001, so audit history stays intact. SEC-P1-001 will be marked `superseded_by: CRON-P1-004`.
3. The user's plan lists the scope as `src/middleware/cron-auth.ts (CREATE)` + `src/routes/api/public/hooks/*.ts (UPDATE)`. The project already has `src/lib/cron-auth.server.ts` (`verifyCronSecret`). Creating a second copy under `src/middleware/` duplicates logic. **Proposed adjustment**: the new file `src/middleware/cron-auth.ts` will be a thin re-export wrapper around `verifyCronSecret` so all hook routes import from one place going forward, with zero behavior change. If you'd rather I move the existing file outright, say so and I'll change the plan.

## Files I will write (governance refresh)

- `docs/engineering/ENGINEERING_CONTRACT.md` → replace with v3.1 LOCKED text from your message.
- `docs/engineering/PROJECT_STATE.yaml` → set `current: { feature: CRON-P1-004, batch: 1, action: EXECUTE }`.
- `docs/engineering/plans/phase-1.yaml` → append `CRON-P1-004` feature with the file list you provided; mark `SEC-P1-001` as `superseded_by: CRON-P1-004`; leave SEC-P1-002 / SEC-P1-003 untouched.
- `docs/engineering/CHANGELOG.md` → append:
  - `SEC-P1-002 Batch 2: PASS (implicit, per CTO dispatch of CRON-P1-004).`
  - `CRON-P1-004 Batch 1: dispatched.`

## Files I will change (CRON-P1-004 / Batch 1 execution)

1. **CREATE** `src/middleware/cron-auth.ts` — re-exports `verifyCronSecret` from `@/lib/cron-auth.server` as `requireCronAuth(request)`, returning the same `Response | null` contract.
2. **UPDATE** every file under `src/routes/api/public/hooks/*.ts` that does not already short-circuit on `verifyCronSecret`. For each:
   - Add `import { requireCronAuth } from "@/middleware/cron-auth"`.
   - At the very top of the `POST`/`GET` handler: `const unauth = requireCronAuth(request); if (unauth) return unauth;`
   - No other edits, no formatting drift.
   - Files already protected stay untouched (will be listed in the report as `ALREADY_PROTECTED`).

I will enumerate `src/routes/api/public/hooks/*.ts` in the execute step and only touch files where the guard is missing. The full list lands in the evidence report below.

## Out of scope (will NOT touch in this batch)

- `src/routes/api/public/monitoring/*` (separate batch under SEC-P1-001, now folded into CRON-P1-004 backlog if you want it later).
- `src/lib/cron-auth.server.ts` (not deleted; new middleware re-exports it).
- Any non-hook public route, contact form, image proxy, etc.

## Validation

- `bunx tsgo --noEmit`
- `bun run build`
- Evidence written to `docs/engineering/reports/CRON-P1-004-batch-1-fixes.md` with: files changed, before/after for one route, validation tails, `ALREADY_PROTECTED` list, `OUT_OF_SCOPE_CANDIDATES` if any.

## Report format (matches your contract v3.1)

```
STATUS: SUCCESS | FAILED | HALTED | BLOCKED
FILES CHANGED: …
VALIDATION: Typecheck PASS/FAIL, Build PASS/FAIL
TRACE: …
```

## Approve to switch to build mode

Approve as written, or tell me to (a) replace `src/lib/cron-auth.server.ts` instead of wrapping it, (b) skip the implicit PASS on SEC-P1-002 Batch 2 and have you record it manually first, or (c) include `api/public/monitoring/*` in the same batch.
