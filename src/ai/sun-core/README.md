# Legacy — `src/ai/sun-core/`

This directory is the **first-generation** Sun Core (jsonb `sun_memory`
+ `sun_decisions` + `SunEngine` dashboard at `/admin-sun-core`).

The **canonical** AI SUN CORE is now `src/ai/core/` (blueprint v1.0),
backed by `ai_events` + `ai_decisions` tables.

Kept temporarily to avoid breaking `/admin-sun-core` and
`event-consumer.ts` fallback. Migration to the new core is scheduled
for **PHASE 1.2**.

Do not add new code here. Use `@/ai/core` instead.
