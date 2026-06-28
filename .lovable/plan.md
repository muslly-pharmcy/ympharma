
## Goal
Establish the frozen EES governance scaffolding under `docs/engineering/`, then execute the first work item (`SEC-P1-002`, Batch 1) from the Phase-1 plan.

## Open question before I build
The execution order says "Execute ONLY the requested Feature and Batch from PROJECT_STATE" — but `SEC-P1-002` has not been defined in any earlier turn. From the v17 audit (`docs/titanus-audit-v17.md`) the P1 backlog includes: cron hook auth hardening, server-only import leaks, RPC grant tightening, etc.

I need you to confirm what `SEC-P1-002` is before I freeze it into `phase-1.yaml`. My proposal:

- **SEC-P1-001**: Cron/webhook endpoints — enforce `CRON_SECRET` on all `/api/public/hooks/*` and `/api/public/monitoring/*` (partially done in prior security batch; finish remainder).
- **SEC-P1-002**: Server-only import leak audit — ensure no `*.server.ts` / `supabaseAdmin` is reachable from the client bundle graph; add a build-time guard.
- **SEC-P1-003**: RPC `GRANT` tightening — review every `public.*` RPC and drop `anon`/`authenticated` execute where not required by policy.

If that mapping is right, Batch 1 of SEC-P1-002 = inventory + fix the top offenders flagged in `docs/titanus-audit-v17.md`.

## Files to create (governance scaffolding)

1. `docs/engineering/ENGINEERING_CONTRACT.md` — read-once contract (rules, output format, change policy, ITRB review loop, PASS/REVISE/REJECT criteria).
2. `docs/engineering/PROJECT_STATE.yaml` — exact YAML you provided, verbatim.
3. `docs/engineering/CHANGELOG.md` — human log, seeded with "2026-06-28 — System frozen at v1.0".
4. `docs/engineering/plans/phase-1.yaml` — Phase-1 plan with SEC-P1-001/002/003 features, each split into batches with explicit acceptance criteria.

## Execution of SEC-P1-002 Batch 1 (after confirmation)

Batch 1 = **inventory only, no code refactor yet**:

- Scan every `src/**/*.server.ts` and every `supabaseAdmin` / `client.server` import.
- Walk the client import graph from `src/routes/**` (excluding `*.functions.ts` handler bodies, which are stripped) to find any chain that pulls a server-only module into the client bundle.
- Produce `docs/engineering/reports/SEC-P1-002-batch-1-inventory.md` listing: file, import chain, severity, proposed fix (rename to `*.server.ts`, move behind `createServerFn`, or dynamic-import inside handler).
- Update `PROJECT_STATE.yaml` → `current.batch = 2, current.action = EXECUTE` only after ITRB PASS.

Batch 2+ (later, separate plan) = apply the fixes.

## Out of scope for this plan
- No edits to application code yet.
- No changes to existing routes, RPCs, or migrations.
- REGISTRY.yaml and DECISIONS.md deferred until a real need appears (per your "practical issue first" rule).

## Question for you
Confirm the `SEC-P1-002` definition above, or paste the canonical definition you want frozen into `phase-1.yaml`. Once confirmed I'll switch to build mode and create all four files + the inventory report in one batch.
