# Engineering Execution Contract

## Read Once Policy

- This document is read once at the start of the project. Do not reread it.

## Core Rules

- **Role:** Lovable is an execution engine only. No planning, no inference, no state updates.
- **Input:** Read `PROJECT_STATE.yaml` and `plans/phase-1.yaml`. Execute ONLY the requested Feature.

## Precedence (عند التعارض)

```
PROJECT_STATE
    ↓
PLAN
    ↓
CONTRACT
```

## Status Enum (مسموح به فقط)

- `READY`
- `EXECUTING`
- `BLOCKED`
- `UNDER_REVIEW`
- `COMPLETED`
- `HALTED`

## Validation

After every batch, run:

- `bunx tsgo --noEmit`
- `bun run build`

## Failure Budget

- If the same batch fails twice consecutively: **HALT** and report `FAILURE_BUDGET_EXCEEDED`.

## Output Format (MANDATORY)

Return ONLY:

```
STATUS: [SUCCESS / FAILED / HALTED]
FILES CHANGED:
- path/to/file.ts (UPDATE/CREATE)
VALIDATION:
- Typecheck: PASS/FAIL
- Build: PASS/FAIL
TRACE: (Brief reason if failed)
```

## State Update Rule

DO NOT modify `PROJECT_STATE.yaml`. Only the CTO (or ITRB) updates the state.

---

Version: 3.1 | Status: LOCKED
