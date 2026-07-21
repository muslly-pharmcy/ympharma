
# Wave R1.3.1 — Admin Client Elimination Audit

## Scope

Read-only classification wave. **No code refactors, no RLS changes, no `supabaseAdmin` removals** — this wave only produces the decision matrix that R1.3.2+ will act on. Downstream waves (R1.4 contract audit, R1.5 domain boundaries, R1.6 secrets, then Tracks B/C) stay queued and are out of scope here.

## Objective

For each of the 90 functions flagged `admin-bypass (gated)` in `WAVE-R1.3-AUTHZ-AUDIT.md`, answer:

> Why does this handler need `supabaseAdmin` instead of `context.supabase` + RLS?

and assign one of four verdicts.

## Classification buckets

| Bucket | Meaning | Typical signals |
|---|---|---|
| **A — Keep (legitimate bypass)** | Must run above RLS by design. | Cron/queue workers, AI runtime writes to `ai_events`/`agent_runs`, audit writer, `getActor()` itself, session bootstrap, backfills. |
| **B — Replace with RLS** | Ordinary CRUD scoped to `actor.organizationId`. RLS policy on the table already exists (or is trivial to add) and would enforce the same tenant/role rule the code enforces today. | Simple insert/update/delete with a single `requirePermission` + `requireOrg` before the write. |
| **C — Service layer required** | Multi-step transactions, cross-table writes, cross-org aggregation, ledger/financial ops, or SECURITY DEFINER RPC candidates. RLS alone cannot express the invariant. | Dispense state-machine, loyalty ledger, insurance claim transitions, PO transitions, campaign send. |
| **D — Redesign** | `supabaseAdmin` used without a real reason, duplicated permission logic, or checks after the write. | Handlers where the admin client is used only to skip writing a policy, or where the org check happens post-mutation. |

## Method (per domain, in this order)

Batch by domain file to keep review reviewable:

1. `customers` + `loyalty` + `promotions` + `campaigns` (CRM cluster)
2. `patients` + `doctors` + `prescriptions` + `dispenses` + `insurance` (medical cluster)
3. `catalog` + `inventory` + `suppliers` + `purchasing` + `sbdma-import` (supply cluster)
4. `ai` + `clinical` + `analytics` + `medical-directory` + `me` + `modules` + `cart` (platform cluster)

For each function in a batch:

- Read the whole handler (not just the analyzer slice) and the helpers it delegates to.
- Query `supabase--read_query` for the target table's existing RLS policies and grants.
- Record: bucket, one-line rationale, existing RLS policy (yes/no), required RLS policy if bucket B, invariant that blocks RLS if bucket C, redesign note if bucket D.

## Deliverables

1. **`scripts/audit-admin-bypass.mjs`** — extends the R1.3 analyzer with per-function context (handler body length, delegated helpers, table names extracted from `.from('...')`, presence of `requirePermission`/`requireOrg` before vs after mutations). Deterministic, reruns cleanly.
2. **`docs/engineering/WAVE-R1.3.1-ADMIN-BYPASS-CLASSIFICATION.md`** — executive summary + one table per domain cluster + one row per function with columns: `file · function · bucket (A/B/C/D) · target tables · has-RLS-today · rationale · follow-up`. Ends with the totals table the user asked for:

   ```text
   Legitimate System Operations   NN
   Replace with RLS               NN
   Service Layer Required         NN
   Needs Redesign                 NN
   ```
3. **Follow-up backlog appended to the same doc**, sequenced but not executed:
   - R1.3.2 — write missing RLS policies for bucket B tables (migration).
   - R1.3.3 — migrate bucket B handlers to `context.supabase` (per-domain PRs).
   - R1.3.4 — extract bucket C into `SECURITY DEFINER` RPCs or a `src/lib/services/` layer with explicit invariants + tests.
   - R1.3.5 — redesign bucket D handlers.

## Non-goals (explicit)

- No migrations run in this wave.
- No handler rewrites.
- No changes to `session.server.ts`, `idempotency.server.ts`, or `_authenticated/route.tsx`.
- No work on Tracks B/C (WhatsApp/Meta) — still gated on Lovable Secrets.
- No R1.4/R1.5/R1.6 work — those remain queued per your ordering.

## Acceptance

- The 90 admin-bypass functions from R1.3 are each assigned to exactly one bucket, with rationale.
- Every bucket B row names the RLS policy that would replace the code check.
- Every bucket C row names the invariant that RLS cannot express.
- The classification script is idempotent (`node scripts/audit-admin-bypass.mjs` reproduces the doc).
