# TITANUS OMEGA X v17.0 — Full System Audit

## Scope
Forensic-grade audit of the entire codebase across 6 dimensions: Code quality, Architecture, Security, Functional completeness, Runtime/Operational readiness, Configuration/Deployment. No areas excluded.

## Deliverables
1. **`docs/titanus-audit-v17.md`** — committed to the repo. Full report with all sections (A–J) from the spec: executive summary, P0/P1/P2/P3 issue cards, scorecards (architecture/security/performance), functional completeness matrix, recommended next steps.
2. **Chat summary** — executive summary table + GO/CONDITIONAL/NO-GO verdict + the P0 list with file:line refs.
3. **Auto-applied P0 patches** — for every finding classified CRITICAL (P0), apply the fix immediately after the report is delivered. Stop and wait for approval on P1/P2/P3.

## Audit method (read-only, no code changes during discovery)

**Phase 1 — Inventory** (parallel)
- File counts and LOC per directory (`src/`, `src/core/`, `src/routes/`, `src/lib/`, `supabase/migrations/`).
- Dependency tree from `package.json`, lockfile drift, `bun pm ls` for duplicates.
- Cron jobs (`SELECT * FROM cron.job`), RLS coverage (`pg_policies`), table grants.

**Phase 2 — Static analysis** (parallel)
- `tsgo` full typecheck — capture every error/warning.
- ESLint full run — capture every rule violation.
- `rg` sweeps for: `any` casts, `// @ts-ignore`, `TODO|FIXME|XXX`, `console.log` in production paths, `dangerouslySetInnerHTML`, hardcoded secrets/URLs, `process.env` at module scope in `*.functions.ts`, raw `fetch` without retry/timeout, missing try/catch around DB calls.
- `supabase--linter` for DB-side findings.
- `code--dependency_scan` for known CVEs.

**Phase 3 — Architecture review**
- Module dependency direction: routes → lib → core → integrations. Flag inverted imports.
- `client.server` import-graph audit — any leak into client bundle = P0.
- God-files (>500 LOC) and God-routes (>10 responsibilities).
- Duplicate logic detection across `src/lib/` vs `src/core/`.

**Phase 4 — Security review**
- Every `/api/public/*` route: signature/secret verification, input validation, PII exposure.
- Every `createServerFn` without `requireSupabaseAuth`: confirm it's intentionally public.
- RLS: every public-schema table has policies AND grants AND `auth.uid()` scoping where needed.
- Storage buckets: path scoping, public vs signed URL discipline.
- Secrets hygiene: `.env` contents, `git log` for accidental commits, client-bundle scan for service-role key shape.
- AI safety: prompt injection guards on every AI call site, PII redaction before LLM.
- Rate limiting coverage on public endpoints.

**Phase 5 — Functional verification**
- UI feature ↔ backend endpoint ↔ DB table mapping. Flag any UI feature without backing implementation or with schema mismatch (column names, types).
- Webhook handlers: signal vs silent failure.
- Event consumer / DLQ: confirm replay path is wired and tested.
- Cron jobs: confirm each scheduled job points at a live endpoint with correct secret header.

**Phase 6 — Runtime/Ops review**
- Health endpoints, startup validation, graceful shutdown, retry/circuit-breaker coverage.
- Backup verification cron + restore drill status.
- Observability: correlation IDs, structured logs, error reporter installation.
- Memory leak surfaces: subscriptions, intervals, blob/object URLs, event listeners without cleanup.

**Phase 7 — Config/Deployment review**
- `vite.config.ts`, `tsconfig.json`, `wrangler`-equivalent, CI workflow.
- Required env vars present in `.env.example`.
- Cron job inventory vs declared endpoints — flag orphans and misaligned secrets.
- Indexes vs slow-query candidates (`supabase--slow_queries`).

## Classification
- **P0 Critical** — security breach, data loss, RLS gap, exposed secret, production-breaking. Auto-fixed.
- **P1 High** — significant security/correctness risk, broken feature, missing auth. Plan only.
- **P2 Medium** — quality/architecture debt, perf regression risk. Plan only.
- **P3 Low** — style, minor cleanup. Plan only.

Each issue card includes: category, severity, file:line, description, root cause, impact, proposed fix (with code where short), effort estimate.

## Auto-fix policy for P0
For each P0:
1. Apply the minimal patch that closes the finding.
2. Re-run the relevant check (typecheck, linter, RLS query) to confirm.
3. Record in the report under "P0 — FIXED IN THIS PASS" with before/after.
P0s that require user input (e.g. a new secret, a third-party config change) are flagged as "P0 — BLOCKED ON USER" with the exact action required.

## Out of scope
- No P1/P2/P3 fixes without explicit approval.
- No design/visual changes.
- No new features.
- No changes to integration-managed files (`src/integrations/supabase/*` auto-gen, `_authenticated/route.tsx`, `supabase/config.toml`).

## Estimated runtime
- Phases 1–7 read-only investigation: produced in a single pass via parallel subagents and shell sweeps.
- Report assembly: one writeup to `docs/titanus-audit-v17.md`.
- P0 patches: depends on count discovered; each patched and verified individually.

## Note re: "exposed git token" warning in the prompt
The prompt template warns about a token in `.git/config`. This codebase's `.git` directory is sandboxed and not part of the published bundle; I'll verify during Phase 4 (secrets hygiene) and report findings rather than treat the template's example token as real.