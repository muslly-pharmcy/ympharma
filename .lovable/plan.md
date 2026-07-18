## Phase 3 — Batched Execution Plan (13 features)

Note: `docs/engineering/` currently contains `ENGINEERING_CONTRACT.md`, `PROJECT_STATE.yaml`, and `plans/phase-3.yaml`. The referenced `STANDARDS.md`, `SECURITY.md`, and `ARCHITECTURE.md` do **not** exist — I'll follow existing project conventions (already internalized) instead of blocking on missing docs. `PROJECT_STATE.yaml` will not be modified (per contract).

### Execution order (4 batches, stop-on-fail)

Each batch ends with `bunx tsgo --noEmit` then `bun run build`. If a gate fails, HALT and report — nothing after that batch runs.

**Batch A — Foundations (no runtime risk)**
1. `DEV-P3-003` — `.vscode/settings.json`, `.vscode/extensions.json`, `scripts/dev-setup.sh`
2. `DOC-P4-001` — `README.md` (update), `docs/deployment.md`, `docs/security.md`
3. `RISK-P3-005` — `docs/engineering/risk-register.md`

**Batch B — Observability & reliability libs (server-only, no schema)**
4. `REL-P3-001` — `src/lib/workers/retry-config.ts`, `src/lib/workers/base-worker.ts`
5. `QOS-P3-002` — `src/lib/monitoring/api-monitor.ts`, `src/lib/middleware/response-time.ts`
6. `INT-P3-006` — `src/lib/health-checks/integrations.ts`, `src/routes/api/public/health.full-check.ts`
7. `EFF-P4-004` — `src/lib/workers/optimization.ts`, `src/lib/workers/scheduler.ts`

**Batch C — DB + audit (single migration, additive only)**
8. `AUDIT-P2-003` — migration for `admin_audit_log` (table + GRANT + RLS + `has_role('admin')` policy), `src/lib/audit/audit-log.ts`, `src/lib/middleware/audit-middleware.ts`
9. `DB-P3-004` — migration adding `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for hot-path columns identified from `supabase--slow_queries` (read-only probe first)

**Batch D — UX, tests, scaling**
10. `PERF-P2-001` — `admin-dashboard.tsx` (lazy-load heavy panels via `React.lazy` + `Suspense`), `vite.config.ts` (manualChunks for admin bundle)
11. `TEST-P4-002` — add focused unit tests under `src/lib/__tests__/` for retry-config, api-monitor, audit-log, integrations health; keep `vitest.config.ts` change minimal (coverage thresholds only)
12. `SCALE-P4-003` — `src/lib/config/scaling.ts`, `docker-compose.scale.yml`
13. `REPORT-P4-005` — `src/lib/dashboard/production-readiness.ts` (aggregates health + integrations + audit + cron), `src/routes/_authenticated/admin-production-readiness.tsx`

### Guardrails
- No changes to `PROJECT_STATE.yaml`, generated Supabase files, or `src/pages/`.
- No new secrets, no new cron jobs, no destructive SQL. `AUDIT` and `DB` migrations are additive (`IF NOT EXISTS`).
- New admin route lives under `_authenticated/` and enforces `has_role('admin'|'owner')` server-side (no client-only gating).
- `/api/public/health.full-check` returns only booleans + latency ms — no PII, no secrets, no version leaks.
- Retry/backoff defaults: max 5, exp base 500ms, cap 30s, jitter — matches existing DLQ patterns.
- Reuses existing infra (`alert_settings`, `ai_world_health`, `agent_runs`, `error_logs`) — no duplicate tables.

### Final report format (returned once at end)
```
STATUS: SUCCESS | PARTIAL | FAILED
FILES CHANGED: <full list, grouped by feature>
VALIDATION: <per-batch tsgo + build result>
OUT_OF_SCOPE_CANDIDATES: <e.g. DB-P3-004 indexes needing prod EXPLAIN before merge>
TRACE: <one-line per feature>
```

### What I will NOT do (and why)
- Won't fabricate `STANDARDS.md` / `SECURITY.md` / `ARCHITECTURE.md` — not in the plan's file list.
- Won't touch `PROJECT_STATE.yaml` — contract forbids it.
- Won't add coverage-blocking thresholds that would fail current CI (start at reporting only).
- Won't add indexes speculatively — will run `supabase--slow_queries` + `supabase--read_query` on `pg_stat_user_indexes` first and only add indexes justified by real hot paths; the rest go to `OUT_OF_SCOPE_CANDIDATES`.

Approve to switch to build mode and execute Batch A → D in order.