# Legacy — `src/ai/sun-core/`

This directory is the **first-generation** Sun Core (jsonb `sun_memory`
+ `sun_decisions` + `SunEngine` dashboard at `/admin-sun-core`).

The **canonical** AI SUN CORE is `src/ai/core/` (blueprint v1.0),
backed by `ai_events` + `ai_decisions` tables.

## Phase 1.2 — Phoenix bridge is live

Phoenix domain events flow into the new core via
`src/ai/core/phoenix-bridge.ts` (drains `agent_events` → enqueues
`ai_events`). The worker route `POST /api/public/ai/sun-tick` runs every
minute (pg_cron: `ai-sun-tick`) and dispatches to agents registered in
`src/ai/bootstrap.ts`. Bridge / queue depth / per-agent decision stats are
shown at the top of `/admin-sun-core`.

Do not add new code here. Use `@/ai/core`, `@/ai/agents/*`, and
`@/ai/events/event-types` instead.
