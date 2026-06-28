# CRON-P1-004 / Batch 1 — Cron Auth Middleware

**Status:** AWAITING_ITRB_VERDICT
**Date:** 2026-06-28

## Files changed

- `src/middleware/cron-auth.ts` (CREATE) — re-exports `verifyCronSecret`
  from `@/lib/cron-auth.server` as `requireCronAuth`. Zero behavior change.

## Hook route audit — `src/routes/api/public/hooks/**`

All 32 hook files inspected. Verdicts:

| File | Verdict | Guard |
|------|---------|-------|
| agent-alerts.ts | PROTECTED | verifyCronSecret |
| agent-maintenance.ts | PROTECTED | verifyCronSecret |
| agents/bi.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/ceo.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/cto.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/cx.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/inventory.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/marketing.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/operations.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/sales.ts | PROTECTED | runAgentHook → verifyCronSecret |
| agents/whatsapp.ts | PROTECTED | verifyCronSecret |
| alerts-worker.ts | PROTECTED | verifyCronSecret |
| backup-verify.ts | PROTECTED | verifyCronSecret |
| chronic-refills.ts | PROTECTED | verifyCronSecret |
| collect-social-stats.ts | PROTECTED | verifyCronSecret |
| customer-rx-notify.ts | PROTECTED | verifyCronSecret |
| dlq-alerts.ts | PROTECTED | verifyCronSecret |
| event-consumer.ts | PROTECTED | verifyCronSecret |
| hourly-error-triage.ts | PROTECTED | verifyCronSecret |
| hourly-health-scan.ts | PROTECTED | verifyCronSecret |
| hourly-self-heal.ts | PROTECTED | verifyCronSecret |
| hourly-validation-audit.ts | PROTECTED | verifyCronSecret |
| nightly-intel.ts | PROTECTED | verifyCronSecret |
| prescription-extract.ts | PROTECTED (by design) | `EXTRACT_WORKER_SECRET` via `x-worker-secret` header (separate scheme; service is 503 if secret unset) |
| record-health.ts | PROTECTED | verifyCronSecret |
| retention-sweep.ts | PROTECTED | verifyCronSecret |
| retry-failed-posts.ts | PROTECTED | verifyCronSecret |
| run-loyalty-reminder.ts | PROTECTED | verifyCronSecret |
| run-reactivation.ts | PROTECTED | verifyCronSecret |
| run-restock-alerts.ts | PROTECTED | verifyCronSecret |
| run-social-posts.ts | PROTECTED | verifyCronSecret |
| rx-mirror.ts | PROTECTED | verifyCronSecret |
| rx-notify.ts | PROTECTED | verifyCronSecret |
| social-callback.ts | PROTECTED (by design) | HMAC-SHA256 (`x-n8n-signature`, `N8N_CALLBACK_SECRET`) — inbound n8n callback, not a cron caller |
| test-alert.ts | PROTECTED | verifyCronSecret |
| validate-uploads.ts | PROTECTED | verifyCronSecret |
| wa-stale-conversations.ts | PROTECTED | verifyCronSecret |
| weekly-ai-enrich.ts | PROTECTED | verifyCronSecret |
| weekly-exec-report.ts | PROTECTED | verifyCronSecret |
| whatsapp-retry.ts | PROTECTED | verifyCronSecret |

**No `UPDATE` edits required.** Every hook is already guarded. The middleware
wrapper is added so future hooks import from `@/middleware/cron-auth`.

## Before / after example

No route was modified in this batch. The new wrapper is:

```ts
// src/middleware/cron-auth.ts
export { verifyCronSecret as requireCronAuth } from "@/lib/cron-auth.server";
```

Future hook pattern:

```ts
import { requireCronAuth } from "@/middleware/cron-auth";

const denied = requireCronAuth(request);
if (denied) return denied;
```

## Validation

- `bunx tsgo --noEmit` — see harness output
- `bun run build` — see harness output

## Acceptance checklist

- ✅ `src/middleware/cron-auth.ts` exports `requireCronAuth`.
- ✅ Every file under `src/routes/api/public/hooks/**` is guarded by
  cron-secret, HMAC, or an explicit worker-secret scheme — documented above.
- ⏳ `tsgo --noEmit` — pending harness.
- ⏳ `bun run build` — pending harness.

## Out-of-scope candidates (NOT modified)

- `src/routes/api/public/monitoring/*` — not in CRON-P1-004 scope; tracked
  under SEC-P1-001 history.
- `src/lib/cron-auth.server.ts` — left in place; the wrapper re-exports it.
- Migrating existing hooks to import from `@/middleware/cron-auth` instead
  of `@/lib/cron-auth.server` — cosmetic, would touch 28 files, propose as
  a follow-up batch if ITRB wants the unified path enforced.
