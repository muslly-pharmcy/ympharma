## Phoenix Phase 2 — Platform Layer & Event Bus

Additive-only foundation. Zero business behavior changes. Existing `src/core/*` (dlq, idempotency, observability, ai-safety, backup, retention) and `src/platform/tenant-context/` are reused, not replaced.

### 1. Directory scaffolding

```
src/
  core/
    events/                    NEW — enterprise event bus
      types.ts                  Event, EventEnvelope, HandlerContext, Result types
      EventPublisher.ts         emit() with org/actor/correlation/idempotency
      EventRegistry.ts          in-process handler registration
      EventDispatcher.ts        executes handlers w/ isolation, retry, DLQ
      constants.ts              canonical event names (ORDER_CREATED, PAYMENT_COMPLETED, INVENTORY_UPDATED, PRESCRIPTION_RECEIVED, USER_REGISTERED, …)
      index.ts                  public surface
    errors/                    NEW — unified error taxonomy
      AppError.ts               typed base + subclasses (ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, InternalError)
      toApiResponse.ts          security-safe serializer (user msg vs dev log)
      index.ts
    validation/                NEW — shared Zod helpers
      commonSchemas.ts          uuid, orgId, pagination, isoDate
      validateInput.ts          server-side wrapper returning typed ValidationError
      index.ts
    cache/                     NEW — abstraction only, no infra
      CacheProvider.ts          interface (get/set/del/wrap)
      InMemoryCache.ts          default implementation, TTL + LRU cap
      keys.ts                   namespace helpers (product:, doctor:, availability:)
      index.ts
  platform/
    tenant-context/            EXISTS — untouched
    permissions/               NEW — adapter over existing user_roles / has_role
      PermissionService.ts      check(userId, permission), hasRole, requireRole
      adapters/legacyRolesAdapter.server.ts   wraps public.has_role RPC
      types.ts                  Permission enum stub, Role type
      index.ts
    feature-flags/             NEW
      FeatureFlagService.ts    isEnabled(flag, {orgId,userId})
      providers/staticProvider.ts   env / JSON backed default
      types.ts
      index.ts
    observability/             NEW — thin re-export of core/observability + trace helpers
      index.ts
  modules/                     NEW — empty scaffold + README (no modules migrated)
    README.md                  module structure standard (domain/data/server/ui/events)
    _template/                 reference skeleton (empty files + README)
docs/engineering/
  standards/
    MODULE-STRUCTURE.md        canonical module layout & rules
    EVENT-CATALOG.md            registry of event names + payload contracts
  reports/
    PHOENIX-P2-platform.md     final report
```

### 2. Event Bus design

- **EventEnvelope**: `{ id (uuid), name, occurredAt, orgId?, actorId?, correlationId, causationId?, idempotencyKey?, payload }`.
- **Publisher.emit(name, payload, ctx)**: builds envelope, calls `IdempotencyService` to short-circuit duplicates, writes an `event_log` audit row via existing `Logger` + Supabase (through a `.server.ts` sink), then hands to `EventDispatcher`.
- **Registry**: process-local map `name -> Handler[]`. Handlers registered via `registerHandler(name, fn, {retries, isolation})`.
- **Dispatcher**: runs handlers with `Promise.allSettled`, applies exponential backoff (reuse `src/lib/retry.ts`), on terminal failure forwards to existing `DLQService` (`src/core/dlq/DLQService.ts`) tagged with `source:'event-bus'`.
- **Idempotency**: reuses `src/core/idempotency/IdempotencyService.ts` (`event:{name}:{idempotencyKey}`).
- **Observability**: each dispatch wraps in `withObservability` + `RequestContext` so trace/correlation/org/user ids propagate to Logger.
- **Server-only pieces** (Supabase writes, DLQ sink) live in `*.server.ts` files; client-safe API surface stays in `index.ts` so UI can call `publisher.emit()` through a server fn.
- Existing `src/lib/event-bus.functions.ts` and `src/routes/api/public/hooks/event-consumer.ts` are **left untouched**; new bus lives alongside and a follow-up phase migrates them.

### 3. Permissions adapter

- `PermissionService.hasRole(userId, role)` calls `supabase.rpc('has_role', ...)` server-side via adapter.
- `check(userId, permission)` maps permission strings to role sets (initial map: `admin.*` -> admin/owner; extensible).
- No DB migrations. Existing `user_roles` table + policies unchanged.

### 4. Feature flags

- Static provider reads `FEATURE_FLAGS` env JSON + optional per-org overrides via `organizations.metadata.feature_flags` (already exists from Phase 1, read-only).
- Interface allows future DB-backed provider without API break.

### 5. Errors, validation, cache

- `AppError` carries `code`, `httpStatus`, `userMessage`, `devDetail`; `toApiResponse` strips `devDetail` in production.
- `validateInput(schema, data)` throws `ValidationError` with Zod issue map.
- `InMemoryCache` is process-local; suitable for SSR worker lifespan; interface leaves room for KV/Redis later.

### 6. Import boundary governance

Extend `scripts/check-imports.ts` with layer rules (additive, run in same script):

- `src/core/**` may NOT import from `src/modules/**` or `src/platform/**`.
- `src/platform/**` may NOT import from `src/modules/**`.
- `src/modules/<A>/**` may NOT import from `src/modules/<B>/**` except via `src/modules/<B>/index.ts` (public export) or `src/core/events`.

Violations fail CI with the same formatter as existing SEC-P1-004 output. Existing server-only rule preserved.

### 7. Observability integration

`EventPublisher` and `PermissionService` both accept an optional `RequestContext`; when omitted they pull the ambient one. Every emit/permission-check log line includes `traceId, orgId, userId, eventId, correlationId`.

### 8. Tests

- `src/__tests__/unit/core/events/EventPublisher.test.ts` — emit + envelope shape + idempotency short-circuit.
- `src/__tests__/unit/core/events/EventDispatcher.test.ts` — success, retry, DLQ handoff, handler isolation (one throws, others still run).
- `src/__tests__/unit/core/errors/AppError.test.ts` — serializer strips dev detail.
- `src/__tests__/unit/platform/feature-flags/FeatureFlagService.test.ts` — org + user override precedence.
- `scripts/check-imports.ts` self-test via `bun scripts/check-imports.ts`.

Run: `bunx vitest run src/__tests__/unit/core src/__tests__/unit/platform` + typecheck + `bun scripts/check-imports.ts` + `bun run build:dev`.

### 9. Documentation

- `docs/engineering/standards/MODULE-STRUCTURE.md` — required folders, public export rule, event-only cross-module comms.
- `docs/engineering/standards/EVENT-CATALOG.md` — initial 5 event names with payload Zod schemas (definitions only, no publishers wired yet).
- `docs/engineering/reports/PHOENIX-P2-platform.md` — architecture changes, file inventory, event model, dependency rules, test results, rollback (delete `src/core/{events,errors,validation,cache}`, `src/platform/{permissions,feature-flags,observability}`, `src/modules/`, revert `scripts/check-imports.ts`).

### 10. Non-goals (explicit)

- No DB migrations.
- No changes to routes, auth, tenant context, or business logic.
- Existing `event-bus.functions.ts` and `event-consumer.ts` NOT modified.
- No module migrations — `src/modules/` ships empty aside from README + `_template/`.
- No new external infrastructure (Redis/KV/queue).

### Completion gate

Stop after Phase 2. Report: files created, event model, security impact (none — additive, server-only sinks behind `.server.ts`), performance impact (in-memory only), remaining risks (dual event system until Phase 3 migration; single-worker cache coherency).
