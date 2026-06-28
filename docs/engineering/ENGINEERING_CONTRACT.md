# Engineering Execution System — Contract v1.0

**Status:** FROZEN  
**Freeze date:** 2026-06-28  
**Approved by:** CTO + ITRB

This contract is read once at the start of every engineering session. It
defines the rules of engagement between the implementing engineer
(Lovable) and the ITRB reviewer (human chief). The contract is immutable
unless a documented practical blocker forces a change.

---

## 1. Source of truth

| Artifact | Purpose | Cadence |
|----------|---------|---------|
| `PROJECT_STATE.yaml` | Single source of state. Names the **current feature, batch, and action**. | Read at the start of every session; updated only by ITRB after a PASS. |
| `plans/phase-<n>.yaml` | The complete, frozen plan for the active phase. | Read once per session. |
| `CHANGELOG.md` | Human-readable log of what shipped. | Append-only after each PASS. |
| `reports/` | Per-batch evidence (inventory, diffs, test output). | Written by the engineer at the end of each batch. |

Anything not in these files is noise. Anything contradicting these files
is wrong.

## 2. Change policy

> **No structural changes without a documented, practical issue.**
> Any proposal must answer: *"What real problem does this solve?"*

- The engineer **must not** modify files outside the batch named in
  `PROJECT_STATE.current`.
- The engineer **must not** update `PROJECT_STATE.yaml`. Only ITRB writes
  to it after a PASS.
- Refactors, renames, dependency bumps, or "while we're in here"
  cleanups are forbidden unless the plan lists them.
- A proposal to change the contract or the plan is filed as a blocker
  entry in `PROJECT_STATE.blockers` — execution halts until ITRB rules.

## 3. Per-batch workflow

1. **Read** `ENGINEERING_CONTRACT.md`, `PROJECT_STATE.yaml`, and the
   active `plans/phase-<n>.yaml`. Stop if any are missing.
2. **Locate** the feature + batch named in `current`.
3. **Execute only that batch** — no extra files, no extra commits.
4. **Produce** the evidence required by that batch's `output_format`
   (usually a report under `docs/engineering/reports/<feature>-batch-<n>-<slug>.md`).
5. **Report** with a short summary: what was done, what evidence was
   written, what wasn't done. No "while I was in there".
6. **Wait** for ITRB verdict before touching anything else.

## 4. ITRB verdicts

| Verdict | Meaning | Next action |
|---------|---------|-------------|
| **PASS** | Batch matches plan + acceptance criteria. | ITRB increments `current.batch` (or advances `current.feature`) and appends to `CHANGELOG.md`. |
| **REVISE** | Batch is on-scope but evidence is incomplete or quality is below bar. | Engineer re-runs the same batch with fixes; failure counter +1. |
| **REJECT** | Batch is off-scope or violates the contract. | Engineer reverts. Failure counter +1. If `consecutive_failures >= 3`, halt and file a blocker. |

## 5. Output format (every batch)

The engineer's report after each batch must contain, in this order:

1. **Feature + batch ID** (e.g. `SEC-P1-002 / Batch 1`).
2. **Files touched** (full paths, one per line).
3. **Evidence path** (the report file under `reports/`).
4. **Acceptance criteria check** — copy each criterion from the plan and
   answer ✅ / ❌ with a one-line justification.
5. **Out-of-scope items observed but NOT fixed** — listed so ITRB can
   schedule them in a future batch.

## 6. Hard prohibitions

- ❌ No edits to `PROJECT_STATE.yaml` by the engineer.
- ❌ No new dependencies without a plan entry.
- ❌ No migrations, RPC changes, or RLS changes unless the batch
  explicitly authorizes them.
- ❌ No "drive-by" formatting, lint-fixing, or import sorting in files
  outside the batch scope.
- ❌ No claims of "fixed" without verifiable evidence in `reports/`.

## 7. Practical-issue exception

The freeze can be amended **only** when execution is physically blocked.
Examples that qualify:

- A batch cannot be completed because the plan references a file/RPC
  that does not exist in reality.
- A dependency named in the plan is unsafe (CVE, removed from registry).
- The acceptance criteria are internally contradictory.

Examples that do **not** qualify:

- "I think there's a cleaner way to structure this."
- "While I was reading this file I noticed…"
- "We should also add tests for X."

When a real blocker appears, the engineer appends an entry to
`PROJECT_STATE.blockers` describing the problem, stops execution, and
waits for ITRB to amend the plan.

---

End of contract.
