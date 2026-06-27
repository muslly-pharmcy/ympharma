## Phase B+ — Observability + Backup Verification Cron (adapted)

The attached v17.0 blueprint assumes a Node host (pino streams, full OTLP gRPC exporter, AsyncLocalStorage-heavy DI). Our runtime is Cloudflare Workers + Supabase, so I'll adapt rather than copy verbatim. The two outcomes you asked for stay the same; the implementation fits the runtime.

### 1. Observability (lightweight, Worker-safe)

**Correlation + trace propagation**
- New `src/core/observability/RequestContext.ts` — generates `correlation_id` (UUID) and parses incoming W3C `traceparent` / `tracestate` headers; falls back to a fresh trace/span id.
- New `src/core/observability/withObservability.ts` — server-route wrapper that:
  - extracts/creates the context per request,
  - sets response headers (`x-correlation-id`, `traceparent`),
  - times the handler and emits one structured log line.
- Server-fn middleware `src/core/observability/observabilityMiddleware.ts` so `createServerFn` chains pick up the same context.

**Central logger**
- New `src/core/observability/Logger.ts` — tiny JSON logger (`info`/`warn`/`error`) writing to `console.*` (Workers stream stdout to logs). No `pino` — it pulls Node streams and breaks on Workers. Each line includes `correlation_id`, `trace_id`, `span_id`, route, status, latency.
- Optional OTLP HTTP exporter (`OtlpHttpExporter.ts`) gated by `OTEL_EXPORTER_OTLP_ENDPOINT` env. Uses `fetch` (no gRPC). If env unset → no-op. I'll **not** install `@opentelemetry/sdk-node` (Node-only); only the protocol-shaped JSON payload.

**Persisted correlation**
- Migration: add nullable `correlation_id text` to `agent_events` and `agent_events_dlq` (+ btree index). New events written through `event-bus.functions.ts` and DLQ replay carry it through.

### 2. Backup Verification cron

- Insert a `pg_cron` job (named `backup-verify-daily`, will be assigned a jobid) running daily at 03:45 UTC, calling `POST /api/public/hooks/backup-verify` via `pg_net` with the `apikey` anon header.
- New route `src/routes/api/public/hooks/backup-verify.ts`:
  - verifies cron secret,
  - calls `BackupVerificationService.verify(10)` using `supabaseAdmin` (dynamic import),
  - if `failed > 0` or `freshness_ok === false`, dispatches an alert via existing `alert-dispatch.server.ts` (Slack/email).
- Persists the run in a new `backup_verification_runs` table (passed/failed/freshness/results JSONB) so `/admin-backup-verify` shows history.
- Manual trigger: existing `verifyBackups` server fn already works for `verifyLatestBackup`-style use; I'll add a "Run now" button on `/admin-backup-verify` that calls it and refreshes the history list.

### What I'm explicitly NOT building from the v17.0 doc

These don't fit Workers/Supabase and would be dead weight:
- pino, async-mutex, full `@opentelemetry/sdk-node`, Redis/Valkey/Memcached cache drivers, Vault/AWS/Azure/GCP secret managers, distributed lock with fencing, CQRS/Event Sourcing/Snapshot/Projection engines, message broker, multi-region replica routing, plugin system, chaos testing harness.
- Real "temporary database" backup restore — not possible on Lovable Cloud; structural dry-run via `BackupRestoreTest` already covers what's verifiable.

If you later want any of those specifically, we revisit per item with a runtime-fit design.

### Files (new)
- `src/core/observability/{RequestContext,Logger,OtlpHttpExporter,withObservability,observabilityMiddleware}.ts`
- `src/routes/api/public/hooks/backup-verify.ts`
- Migration: `correlation_id` columns + `backup_verification_runs` table + grants/RLS + pg_cron schedule
- `src/routes/admin-backup-verify.tsx` — add history table + "Run now" button

### Files (edited)
- `src/lib/event-bus.functions.ts` — write `correlation_id` on insert
- `src/core/dlq/DLQReplayEngine.ts` — propagate `correlation_id`
- a couple of `/api/public/hooks/*` routes wrapped with `withObservability`

Approve and I'll build it in this order: migration → observability core → wrap hooks → backup-verify route → admin UI button.
