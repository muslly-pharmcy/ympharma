# Phoenix Phase 2 — Platform Layer & Event Bus

**Status:** CLOSED
**Date:** 2026-07-14
**Scope:** Additive-only platform foundation. No business behavior changes.

## Architecture changes

New enterprise layer under `src/core/` (framework-agnostic primitives) and
`src/platform/` (tenant-aware services). Existing `src/core/{dlq,idempotency,observability,ai-safety,backup,retention}`
and `src/platform/tenant-context/` are reused unchanged.

```
src/
  core/
    events/        ← NEW  (event bus)
    errors/        ← NEW  (typed error taxonomy)
    validation/    ← NEW  (Zod helpers)
    cache/         ← NEW  (abstraction only)
  platform/
    tenant-context/  (existing)
    permissions/   ← NEW  (adapter over has_role RPC)
    feature-flags/ ← NEW  (static provider, env-backed)
    observability/ ← NEW  (thin re-export layer)
  modules/         ← NEW  (empty scaffold + README + _template)
```

## Files created (36)

**Core events (7)**
- `src/core/events/types.ts` — `EventEnvelope`, `EmitContext`, `EventHandler`, `HandlerContext`
- `src/core/events/constants.ts` — canonical event names (`EVENTS`)
- `src/core/events/EventRegistry.ts` — in-process handler registration
- `src/core/events/EventDispatcher.ts` — isolation + retry + DLQ handoff
- `src/core/events/eventDlqSink.server.ts` — server-only insert into `agent_events_dlq`
- `src/core/events/EventPublisher.ts` — envelope build + idempotency guard + dispatch
- `src/core/events/index.ts` — public surface

**Core errors (3)** — `AppError.ts`, `toApiResponse.ts`, `index.ts`
**Core validation (3)** — `commonSchemas.ts`, `validateInput.ts`, `index.ts`
**Core cache (4)** — `CacheProvider.ts`, `InMemoryCache.ts`, `keys.ts`, `index.ts`

**Platform permissions (4)** — `types.ts`, `PermissionService.ts`,
`adapters/legacyRolesAdapter.server.ts`, `index.ts`
**Platform feature-flags (4)** — `types.ts`, `FeatureFlagService.ts`,
`providers/staticProvider.ts`, `index.ts`
**Platform observability (1)** — `index.ts` (re-export layer)

**Modules scaffold (7)** — `README.md`, `_template/{README.md, index.ts,
domain/types.ts, data/queries.ts, server/service.ts, ui/index.ts, events/index.ts}`

**Tests (4)** — `EventPublisher.test.ts`, `EventDispatcher.test.ts`,
`AppError.test.ts`, `FeatureFlagService.test.ts`

**Docs (3)** — `docs/engineering/standards/MODULE-STRUCTURE.md`,
`docs/engineering/standards/EVENT-CATALOG.md`, this report

**Governance (1 modified)** — `scripts/check-imports.ts` extended with
PHOENIX-P2 layer rules R1/R2/R3.

**Side effects (2 renames, mechanical, no behavior change)**
- `src/lib/notifications/slack-alerts.ts` → `slack-alerts.server.ts`
- `src/lib/monitoring/cron-monitor.ts` → `cron-monitor.server.ts`
  (both were already documented as server-only; rename satisfies existing
  SEC-P1-004 rule that had a stale pre-existing violation).

## Event model

Envelope: `{ id, name, occurredAt, orgId, actorId, correlationId, causationId, idempotencyKey, payload }`

Flow:
1. `emit(name, payload, ctx)` builds the envelope (uuid via Web Crypto).
2. If `idempotencyKey` supplied → check `IdempotencyService` (scope `event:<name>`).
   Duplicate ⇒ short-circuit and return empty result.
3. Store lightweight marker (fire-and-forget).
4. `dispatch(envelope)` runs registered handlers with `Promise.allSettled`
   (error isolation).
5. Each handler wrapped in `withRetry` (exponential backoff via `src/lib/retry.ts`).
6. Terminal failure ⇒ `eventDlqSink.server.ts` inserts into `agent_events_dlq`
   (server-only, dynamic-imported).
7. Every log line carries `event_id`, `event_name`, `correlation_id`, `org_id`,
   `actor_id` via `Logger.child()`.

Registered canonical names (see `docs/engineering/standards/EVENT-CATALOG.md`):
`order.created`, `order.cancelled`, `payment.completed`, `payment.failed`,
`inventory.updated`, `inventory.low_stock`, `prescription.received`,
`prescription.approved`, `user.registered`, `user.invited`.

Coexistence: `src/lib/event-bus.functions.ts` and
`src/routes/api/public/hooks/event-consumer.ts` are untouched. Phase 3+
migrates producers/consumers onto the new bus.

## Dependency rules (`scripts/check-imports.ts`)

- **R1** `src/core/**` ⇏ `src/modules/**` or `src/platform/**`
- **R2** `src/platform/**` ⇏ `src/modules/**`
- **R3** `src/modules/<A>/**` ⇏ internals of `src/modules/<B>/**`
  (allowed: `@/modules/<B>` or `@/modules/<B>/index`, or `@/core/events`)

CI verification:
```
✅ SEC-P1-004: scanned 404 client-reachable files — 0 violations.
✅ PHOENIX-P2: scanned 522 files — 0 layer violations.
```

## Testing results

```
Test Files  4 passed (4)
     Tests  12 passed (12)
```

- `EventPublisher.test.ts` — envelope shape + idempotency short-circuit
- `EventDispatcher.test.ts` — isolation, retry, no-handler
- `AppError.test.ts` — code/status assignment + user-safe serializer
- `FeatureFlagService.test.ts` — global / org / user override precedence

Typecheck: `bunx tsgo --noEmit` → 0 errors.
Layer guard: `bun scripts/check-imports.ts` → both rulesets pass.

## Security impact

None. Additive-only:
- All Supabase writes (`agent_events_dlq`, `idempotency_keys`, `has_role`) are
  invoked from `*.server.ts` files or via `await import()` inside `.handler()`
  bodies — never leaked to client bundles.
- `PermissionService` adapts over the existing `has_role` RPC; no new roles,
  no policy changes.
- `toApiResponse` strips `devDetail` in production (`NODE_ENV==='production'`).
- Feature-flag static provider reads env only on the server; client callers
  get `false` when env is unavailable.

## Performance impact

- Event dispatch is in-process; no network hop unless a handler makes one.
- `InMemoryCache` is process-local (max 1000 entries, LRU) — safe for the
  Worker request lifetime; no cross-worker coherency.
- Idempotency check adds one Supabase round-trip per emit **when** an
  `idempotencyKey` is supplied (otherwise skipped).

## Remaining risks

- **Dual event system** until Phase 3 migrates existing publishers/consumers
  onto the new bus. Both continue to work; no runtime conflict.
- **Single-worker cache coherency** — `InMemoryCache` will diverge across
  Cloudflare Worker instances. Acceptable for request-scoped memoization;
  swap to a distributed provider (KV/Redis) when catalog/availability caches
  land.
- **Fire-and-forget idempotency store** — a store failure allows a duplicate
  through. Logged as `event.idempotency_check_failed`; acceptable given
  handlers are otherwise idempotent by contract.
- **`PERMISSION_ROLE_MAP` is intentionally minimal** — extend per module.

## Rollback strategy

Fully reversible (no schema changes, no data migrations):

1. `rm -r src/core/{events,errors,validation,cache}`
2. `rm -r src/platform/{permissions,feature-flags,observability}`
3. `rm -r src/modules`
4. `rm -r src/__tests__/unit/core src/__tests__/unit/platform`
5. Revert `scripts/check-imports.ts` to remove the PHOENIX-P2 block
6. `git mv` the two `.server.ts` renames back to their original names and
   revert the importer

No callers depend on the new bus yet, so removal is safe.

## Completion gate

Phase 2 CLOSED. Do NOT auto-continue to Phase 3 (module migration).
