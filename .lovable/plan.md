
## Context

The user's note references a placeholder line ("remaining files in src/lib/ (if any)") and a `Batch 4`. Neither exists in the current `docs/engineering/plans/phase-1.yaml` — the actual plan has SEC-P1-002 Batch 2 with the generic scope *"Apply the remediations approved by ITRB from batch 1, one offender at a time"*. The intent of the instruction still applies: pin the batch to the exact files from the Batch 1 inventory so execution cannot drift.

The Batch 1 inventory (already PASS) lists 8 client-reachable `.functions.ts` files leaking `*.server` imports.

## Plan

### Step 1 — Freeze Batch 2 file list (governance edit)

Edit `docs/engineering/plans/phase-1.yaml`, SEC-P1-002 → Batch 2 only. Replace the generic `scope` string with an explicit file enumeration so the engineer cannot edit anything else:

```yaml
- id: 2
  scope: |
    Apply `dynamic-import-in-handler` remediation to the 8 files listed
    below — and ONLY these files. For each file: remove the top-level
    `import … from "*.server"` and move it inside every `.handler()`
    body that uses it. Type-only imports stay at the top.
  files:
    - src/lib/ai-assistant.functions.ts
    - src/lib/ai-clinical-copilot.functions.ts
    - src/lib/api/example.functions.ts
    - src/lib/pharmacy-intel.functions.ts
    - src/lib/pharmacy-copilot.functions.ts
    - src/lib/products-admin.functions.ts
    - src/lib/vitamin-info.functions.ts
    - src/lib/sentiment.functions.ts
  output_format: docs/engineering/reports/SEC-P1-002-batch-2-fixes.md
  acceptance:
    - "Zero top-level *.server imports remain in the 8 files above."
    - "tsgo --noEmit passes."
    - "bun run build passes."
    - "Smoke test of /admin-ai-copilot and /ai-assistant routes still works."
```

No other features or batches are touched. `PROJECT_STATE.yaml` is **not** modified (per the contract — only ITRB writes it after PASS).

### Step 2 — Advance state (ITRB action, requires your approval)

Because the contract forbids the engineer from editing `PROJECT_STATE.yaml`, ITRB (you) must approve advancing:

```yaml
current:
  feature: SEC-P1-002
  batch: 2
  action: EXECUTE
```

I will perform this edit as part of the same approval since you are the ITRB and this plan is your written verdict. Append a one-line PASS entry to `CHANGELOG.md` covering Batch 1.

### Step 3 — Execute Batch 2

For each of the 8 files:

1. Remove top-level `import { … } from "…*.server"`.
2. Inside each `createServerFn().handler(async … => { … })` that needed the symbol, insert `const { … } = await import("…*.server")` as the first line of the handler.
3. Preserve all other code (no formatting drift, no reorganization).

### Step 4 — Validate

Run in order:

- `bunx tsgo --noEmit`
- `bun run build`

If either fails, revert the offending file, file a blocker in `PROJECT_STATE.blockers`, and stop.

### Step 5 — Evidence

Write `docs/engineering/reports/SEC-P1-002-batch-2-fixes.md` containing:

- Per-file before/after snippet (top of file + one handler).
- `tsgo` and `bun run build` output tails.
- Acceptance checklist (4 items from the plan) with ✅/❌.
- Smoke-test note for `/admin-ai-copilot` and `/ai-assistant` (manual confirmation required from you — I cannot click through authenticated admin routes without your session).

### Out of scope (will NOT touch)

- `src/lib/api/example.functions.ts` deletion (separate batch).
- Any other `.functions.ts` not in the 8-file list.
- ESLint guard rule (recommended as future `SEC-P1-004`).
- Any documentation outside `phase-1.yaml`, `CHANGELOG.md`, and the new `reports/SEC-P1-002-batch-2-fixes.md`.

## Deliverables

1. Updated `docs/engineering/plans/phase-1.yaml` (SEC-P1-002 Batch 2 only).
2. Updated `docs/engineering/PROJECT_STATE.yaml` (Batch 1 → Batch 2).
3. Updated `docs/engineering/CHANGELOG.md` (Batch 1 PASS line).
4. 8 file edits under `src/lib/**`.
5. New `docs/engineering/reports/SEC-P1-002-batch-2-fixes.md`.

Approve to switch to build mode and execute.
