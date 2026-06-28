## Context — blocker on the contract

The brief assumes `plans/phase-3.yaml` exists and `PROJECT_STATE.yaml` is already flipped to `Phase3 / SEC-P1-004 / EXECUTING`. Neither is true in the repo:

- `docs/engineering/plans/` contains only `phase-1.yaml`, `phase-2.yaml`.
- `docs/engineering/PROJECT_STATE.yaml` is still `Phase2 / CLOSED / IDLE`.

Per `ENGINEERING_CONTRACT.md` I cannot self-flip state. So this plan covers both the governance flip and the actual SEC-P1-004 Batch 1 work in one approved step.

## Scope (approve once, then I switch to build mode and do all of it)

### A. Governance files
1. **CREATE** `docs/engineering/plans/phase-3.yaml` — full 15-feature plan exactly as you pasted.
2. **UPDATE** `docs/engineering/PROJECT_STATE.yaml`:
   - `phase: Phase3`
   - `plan_file: plans/phase-3.yaml`
   - `phase_status: READY`
   - `current: { feature: SEC-P1-004, batch: 1, action: EXECUTING }`
   - keep prior notes, append Phase 3 opening note.
3. **UPDATE** `docs/engineering/CHANGELOG.md` — append "Phase 3 opened; SEC-P1-004 Batch 1 started".
4. **UPDATE** `docs/engineering/REGISTRY.yaml` if present — register the 15 Phase 3 features.

### B. SEC-P1-004 Batch 1 — CI Import-Graph Guard
Per `plans/phase-3.yaml`:
1. **CREATE** `scripts/check-imports.ts` — Node/Bun script that:
   - Walks `src/**/*.{ts,tsx}` excluding `*.server.ts`, `*.server.tsx`, `src/integrations/supabase/client.server.ts`, `src/core/**/*.server.ts`, and test files.
   - Parses each file for `import ... from '...'` and dynamic `import('...')`.
   - Flags **top-level static imports** whose resolved path ends in `.server.ts`/`.server.tsx` or matches `**/*.server`.
   - Allows dynamic `await import(...)` inside function bodies (matches our SEC-P1-002 remediation pattern).
   - Exits non-zero on any violation, printing file:line + offending import.
2. **CREATE** `.github/workflows/import-guard.yml` — runs on every PR + push to main:
   - Sets up Bun.
   - Runs `bun run scripts/check-imports.ts`.
   - Fails the PR on violations.
3. **CREATE** `docs/engineering/reports/SEC-P1-004-batch-1-fixes.md` — execution report.

### C. Validation
- `bunx tsgo --noEmit`
- `bun run build`
- `bun run scripts/check-imports.ts` locally → expect 0 violations (SEC-P1-002 already cleaned the offenders).

## Out of scope (will not touch)
Source files under `src/` other than the new script; any of the other 14 Phase 3 features; database; secrets.

## Final report shape
Will return the exact `STATUS / FILES CHANGED / VALIDATION / OUT_OF_SCOPE_CANDIDATES / TRACE` block the contract requires.

---

**Approve and I execute A + B + C in one build-mode batch.** If you'd rather I split A (governance) from B (code) into two approvals, say so.
