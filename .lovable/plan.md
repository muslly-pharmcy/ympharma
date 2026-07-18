
# Verified Audit — Read-Only Pass

Scope: **A + Minimal**. Zero code edits, zero migrations, zero destructive commands. Deliverable is a single fact-based report with prioritized findings.

## What I will run (read-only)

1. **Build & Types**
   - `bunx tsgo --noEmit` — full TypeScript check
   - `bun run build` (if safe) — surface bundler errors only; no deploy
   - `bunx eslint .` — lint findings (count + top rules)

2. **Import graph guards**
   - `bun scripts/check-imports.ts` — verify no `client.server` leaks into client bundle
   - Grep for known risk patterns: `process.env` at module scope, `supabaseAdmin` in `.functions.ts`, `VITE_*` secrets

3. **Database health (read-only)**
   - `supabase--linter` — RLS gaps, permissive policies, exposed columns
   - `supabase--read_query` for:
     - Tables in `public` with RLS disabled
     - Tables with `USING (true)` policies
     - `SECURITY DEFINER` functions missing `search_path`
     - `pg_cron` jobs + last 20 `cron.job_run_details` (fail rate, 401s)
     - Unindexed FKs on hot tables (`ai_events`, `ai_decisions`, `agent_runs`, `orders`, `prescription_files`)
   - `supabase--slow_queries` — top 20 by total time

4. **Runtime signals**
   - `error_logs` last 24h — grouped by message
   - `ai_world_health` current status per system
   - `agent_runs` failure rate last 24h
   - `operations_alerts` open items

5. **Security scan**
   - `security--get_scan_results` — surface only; no fixes

6. **Route & integration inventory**
   - Count routes under `src/routes/` vs `_authenticated/`
   - Public `/api/public/*` endpoints — verify each has auth/signature check declared (grep, not exec)
   - Cross-check `docs/engineering/reports/route-audit-v2.md` for drift

## Deliverable

One file: `docs/engineering/reports/AUDIT-2026-07-18.md` containing:

```text
1. Executive summary (health score /100 with math shown)
2. P0 blockers (verified — with evidence line/query result)
3. P1 issues (verified)
4. P2 / tech debt (verified)
5. Unverified suspicions (explicitly labeled, not asserted)
6. Deltas vs previous audits (AUDIT-2026-07-17, route-audit-v2)
7. Recommended next scope (does NOT execute)
```

## Explicit non-goals this turn

- No migrations
- No file edits beyond writing the single report file
- No cron changes, no secret rotation, no RLS changes
- No "self-healing loop" — the directive's continuous SCAN→FIX→REPEAT is refused; each fix must be its own reviewed turn
- No claims of "Production Ready" — the report ends with a score and gaps, not a verdict

## Guardrails from prior turns

- Every current-state claim in the report is backed by a tool call output quoted inline
- Anything I cannot verify is placed under "Unverified suspicions", not asserted as fact
- No new tables, no new agents, no new dashboards proposed inside the audit itself

After you approve, I switch to build mode only to write the single markdown report.
