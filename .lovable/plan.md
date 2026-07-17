
## Reality Check on Blueprint

Three hard mismatches with the running system — literal execution would break the build or regress Phase 1:

1. **`agent_events` schema mismatch.** Blueprint assumes columns `event_type / status / priority / target_agent`. Real table has `event_name, entity_type, entity_id, payload, source, processed_at, processed_by, retry_count, last_error, correlation_id` — no `status`, no `priority`, no `event_type`. A `PhoenixEventAdapter` written verbatim throws on every insert.
2. **`ai_events` already exists and already matches the blueprint's shape**, and Phase 1.1 shipped `src/ai/core/event-bus.ts` on top of it. Rewiring the Sun to the older `agent_events` table is a regression, not an integration.
3. **Runtime is a Cloudflare Worker** (TanStack Start). `server/jobs/ai.ts` with `setInterval(..., 10000)` cannot run — Workers have no long-lived process. Background execution must be `pg_cron` → `/api/public/*` route with `x-cron-secret`, matching the pattern already used by `prescription-extract-worker`.

Also minor: blueprint imports `@/lib/supabase` (doesn't exist — correct path is `@/integrations/supabase/client`), and `intelligentRoute` duplicates the existing `routeEvent` in `event-router.ts`.

## Proposed Adapted Plan (Phase 1.2)

Keep the intent (bridge Sun ↔ Phoenix, add first real agent, run in the background), but on the real schema and real runtime.

### A. Phoenix bridge (both directions, not replacement)
- `src/ai/core/phoenix-bridge.ts` — translates existing `agent_events` rows (`event_name` → `event_type`, `entity_type/entity_id` folded into `payload`) into `AIEvent` and enqueues them onto `ai_events` via the existing `EventBus`. Marks the source row `processed_at = now(), processed_by = 'sun-bridge'`.
- Keep `ai_events` as the Sun's queue of record. `agent_events` stays the Phoenix domain-event log.

### B. Event type registry
- `src/ai/events/event-types.ts` — `AI_EVENTS` const + `AIEventType` union. Refactor `event-router.ts` to consume it (removes stringly-typed switch, no behavior change).
- Add `SALES_ORDER_CREATED → sales_agent` and `EXPIRY_WARNING → inventory_agent` mappings.

### C. First real agent
- `src/ai/agents/base-agent.ts` — abstract class implementing existing `AIAgent` interface (name/role/capabilities/execute + protected `log`).
- `src/ai/agents/medical/pharmacist-agent.ts` — `PharmacistAgent extends BaseAgent`. For now returns the deterministic analysis skeleton from the blueprint (status: review_required, medications passthrough, confidence 0.92). Real Gemini call is deferred to Phase 2 to keep this phase server-safe and free.
- `src/ai/bootstrap.ts` — instantiates `AgentRegistry`, registers `PharmacistAgent`. Exported `registry` used by the worker route.

### D. Worker as a server route (not setInterval)
- `src/routes/api/public/ai/sun-tick.ts` — POST handler, requires `x-cron-secret` (reuses `src/middleware/cron-auth.ts`). Body of the handler:
  1. `phoenixBridge.drain(limit=50)` — pull new `agent_events`, publish to `ai_events`, mark processed.
  2. `eventBus.getPending()` (limit 50) → for each: `routeEvent` → `registry.get` → `agent.execute` → persist to `ai_decisions` via existing `DecisionEngine` → update `ai_events.status`.
  3. Return `{ bridged, processed, failed }`.
- `pg_cron` job `ai-sun-tick` every 1 minute, calling that endpoint with the cron secret. Documented in migration; no new tables (`ai_events`, `ai_decisions`, `agent_events` all exist).

### E. Dashboard hook
- Extend `/admin-sun-core` to show: bridge lag (unprocessed `agent_events` count), Sun queue depth (`ai_events` pending), last tick timestamp, per-agent decision count last 24h. Read-only, admin-gated (already in place).

### F. Legacy cleanup
- Update `src/ai/sun-core/README.md` note to point at the new bridge as the canonical Phoenix ingress.

## Out of scope (deferred to Phase 1.3 as user described)
- Short/long memory tables, feedback loop, Neural Memory Planet — next phase.
- Real LLM inference inside `PharmacistAgent` — hooked in Phase 2 with Gemini via Lovable AI Gateway.
- Adding `inventory_agent`, `customer_agent`, `sales_agent` implementations (registry entries only; unknown-agent events remain queued, not failed).

## Files touched
Create: `src/ai/core/phoenix-bridge.ts`, `src/ai/events/event-types.ts`, `src/ai/agents/base-agent.ts`, `src/ai/agents/medical/pharmacist-agent.ts`, `src/ai/bootstrap.ts`, `src/routes/api/public/ai/sun-tick.ts`.
Edit: `src/ai/core/event-router.ts` (use registry), `src/routes/admin-sun-core.tsx` (add bridge/tick panel), `src/ai/sun-core/README.md`.
Migration: schedule `pg_cron` `ai-sun-tick` (net.http_post to the sun-tick route with `x-cron-secret`). No schema changes.

Confirm and I'll execute in build mode.
