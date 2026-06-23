# TITAN-OMNIBUS v7.0 — Certification Plan

## Deliverable

One new file: `docs/titan-omnibus-v7-certification.md`

No code changes. No file moves. No DB migrations. Purely an audit report graded against real evidence already in the repo and database.

## Why a plan, not direct execution

The repo already contains 21 audit/certification docs and 30 active cron jobs — adding another report deserves a scoped, transparent contract before writing, otherwise we risk producing yet another "ceremonial" certificate that the v7.0 protocol itself explicitly forbids.

## Audit Methodology (applied verbatim from v7.0)

1. **Evidence collection (read-only):** open the actual source files, run SELECT-only DB queries, list the registered cron jobs and recent runs.
2. **Per-check tagging:** every checklist item gets
   - `STATUS`: ✅ / ⚠️ / ❌ / UNKNOWN
   - `EVIDENCE`: `path/to/file.ts:line-range` or `cron.job` row or `SELECT ...` result
   - `CONFIDENCE`: 0–100%
   - `VERIFICATION`: `STATIC VERIFIED` (code only) / `RUNTIME VERIFIED` (cron history, test run, or DB state) / `NOT VERIFIED`
3. **Evidence Coverage Gate:** `Verified / Total`. If <80% → verdict locked to `INSUFFICIENT EVIDENCE`.
4. **Runtime Gate:** any UNKNOWN in Security or Reliability → verdict locked to `NO-GO`.
5. **Executive Stop trigger:** secret leakage, missing auth, missing HMAC, missing RLS, data-corruption risk, financial risk → report halts and emits `EXECUTIVE STOP` with Impact / Blast Radius / Mitigation.

## Audit Scope (7 axes, ~35 checks)

| # | Axis | Primary evidence sources |
|---|---|---|
| 1 | Security | `cron-auth.server.ts`, `n8n-callback-auth.server.ts`, RLS state from `pg_policies`, user_roles + `has_role` function, sample of `*.server.ts` for secret usage |
| 2 | Reliability | `deepseek.server.ts` (timeout/retry), `social-publisher.server.ts` (concurrency/idempotency), `retry-failed-posts.ts` + `cron.job` row, `social_post_attempts` recent rows |
| 3 | Performance | `pg_indexes` on `social_posts` / `social_post_attempts` / `orders`, sample queries for `select(*)` vs explicit columns, concurrency constants |
| 4 | Scalability | Queue topology (cron-driven vs queue), batch-size constants, single-region constraints |
| 5 | Observability | `hmac-preflight.functions.ts`, structured logs in publisher, `cron-failure-monitor` job, `uptime_checks` table, `agent_events` / `agent_events_dlq` |
| 6 | Recovery / DR | `backup-daily` + `backup-weekly` cron, `backups` table rows, `disaster-recovery.md`, rollback path |
| 7 | Governance | `retention-daily` cron + `retention_config`, `activity_logs` / `agent_actions` audit trails, `OPS_MANUAL` / `SYSTEM_BIBLE` presence |

## Known constraints that will shape the verdict (declared upfront)

- **n8n `workflow.json` not provided.** Integration Assurance (HMAC encoding inside n8n, retry nodes, DLQ topology) cannot be `RUNTIME VERIFIED`. Per protocol this is `UNKNOWN` for that line — not a fail by itself, but it caps the overall verdict at **GO WITH CONDITIONS** at best.
- **Pre-existing linter findings (~111 warnings)** detected last migration are not introduced by this audit; they will be inventoried, not re-litigated.
- The audit will not claim load-test results, chaos-test results, or pen-test results that have not actually been run; those become `NOT VERIFIED` lines.

## Report Structure (sections, in order)

1. Executive Summary (verdict + one paragraph)
2. Evidence Coverage calculation (the actual fraction)
3. Per-axis checklist tables (the 35 graded rows)
4. Evidence Matrix (flat list of every file/query cited)
5. Residual Risks (Severity / Mitigation / Residual)
6. Executive Stop section — populated only if triggered
7. Final Certification block (Verdict / Justification / Conditions / Signatures)

## Expected verdict envelope (honest prior)

Most likely outcome given current state: **GO WITH CONDITIONS** — the conditions being (a) upload + review of n8n `workflow.json`, (b) one week of pilot monitoring on the new `retry-failed-social-posts` cron, (c) addressing any CRITICAL items the audit surfaces. A full `GO` is not achievable in this pass because integration cannot be runtime-verified without the workflow file. An `EXECUTIVE STOP` is only issued if the audit discovers an actual leak / missing auth — not pre-supposed.

## Out of scope (will not do in this plan)

- Editing code, migrations, or RLS policies.
- Re-running the existing 21 audit docs' findings.
- Generating a `workflow.json` from documentation (would violate the Anti-Hallucination contract).
- Auto-fixing linter findings.

## Approval

Approve to switch into build mode and write `docs/titan-omnibus-v7-certification.md` exactly as specified. If you want the scope wider (e.g., include a live HMAC preflight call), narrower (e.g., security axis only), or want the report in Arabic instead of English, say so and I will reissue the plan.
