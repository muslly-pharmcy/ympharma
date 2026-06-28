## Plan: Close SEC-P1-004 → Execute OPS-P2-002 Batch 1

### Step 1 — Flip state (CTO action)
Update `docs/engineering/PROJECT_STATE.yaml`:
- `current.feature: OPS-P2-002`
- `current.batch: 1`
- `current.action: EXECUTING`
- Append note: "SEC-P1-004 Batch 1 CLOSED — PASS (ITRB approved). OPS-P2-002 Batch 1 OPENED."

### Step 2 — Append CHANGELOG entry
`docs/engineering/CHANGELOG.md`:
- "SEC-P1-004 Batch 1 — PASS (ITRB approved 2026-06-28). CI import-graph guard active."
- "OPS-P2-002 Batch 1 — OPENED."

### Step 3 — Execute OPS-P2-002 Batch 1 (Cron Job Monitoring & Alerts)
Per `plans/phase-3.yaml`, files in scope:
- `src/lib/monitoring/cron-monitor.ts` (CREATE)
- `src/lib/notifications/slack-alerts.ts` (UPDATE — file does not exist yet; will CREATE as thin wrapper around the existing `src/lib/slack.functions.ts` / `src/lib/alert-dispatch.server.ts` to avoid duplicating dispatch logic)

**`src/lib/monitoring/cron-monitor.ts`** — server-only helper (`.server`-style; exported via plain `.ts` since the file is not client-reachable). Provides:
- `checkCronHealth()`: queries `cron.job_run_details` for last 24h runs of registered jobs, flags jobs with no recent successful run within their expected interval, or with >N consecutive failures.
- Returns `{ jobName, lastRun, status, consecutiveFailures }[]`.
- `dispatchCronAlerts(report)`: when unhealthy entries exist, calls the slack-alerts wrapper.

**`src/lib/notifications/slack-alerts.ts`** — thin re-export/wrapper:
- `sendSlackAlert({ title, body, severity })` → delegates to existing `postWithRetry` Slack dispatcher in `alert-dispatch.server.ts`.
- Centralizes alert formatting (severity prefix, code block) so future monitors share one entrypoint.

No DB schema changes. No cron hook changes. No client imports.

### Step 4 — Validation
- `bunx tsgo --noEmit` → must PASS
- `bun run build` → must PASS
- Confirm no client-reachable file imports the new monitor module.

### Step 5 — Reports
- Create `docs/engineering/reports/OPS-P2-002-batch-1-execution.md` with files touched, validation results, OUT_OF_SCOPE_CANDIDATES.

### Out of scope
- Wiring `checkCronHealth()` into a scheduled hook (would touch `src/routes/api/public/hooks/*` and the cron schedule — propose as OPS-P2-002 Batch 2).
- Slack webhook configuration (already managed via secrets).
- Any other Phase-3 feature.