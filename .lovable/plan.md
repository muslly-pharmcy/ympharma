
## Plan — PHASE 1 (AI SUN CORE v1.0 blueprint) + Build Fix

### 0) Build blocker (must land first)
`src/modules/inventory-intelligence/index.ts` re-exports from `./server/intelligence.functions`. TanStack import-protection denies any client-reachable import under `**/server/**`. Fix in one edit:

- Move `src/modules/inventory-intelligence/server/intelligence.functions.ts` → `src/modules/inventory-intelligence/intelligence.functions.ts` (kept as thin client-safe server-fn declarations; heavy helpers stay in a `*.server.ts` sibling and are `await import`ed inside handlers).
- Update the `index.ts` barrel and the `/admin-inventory-intel` route import path.
- Rerun `bun run build:dev` to confirm green.

While there, silence the deprecation warnings in the same touched file only: `.inputValidator(` → `.validator(` (no behavior change). Other files listed in the warning stay untouched this turn.

### 1) New AI SUN CORE per blueprint (`src/ai/core/`)
Create the blueprint layout **alongside** the existing `src/ai/sun-core/` (kept temporarily so nothing breaks), with the blueprint's schema and files:

```
supabase/migrations/xxxx_create_ai_sun_core.sql   -- ai_events, ai_decisions, extends ai_agents seed
src/ai/core/
  types.ts
  event-bus.ts
  agent-registry.ts
  event-router.ts
  decision-engine.ts
  sun-engine.ts
  index.ts
```

Migration contents (adapted to the real DB — `ai_agents` already exists, so use `ADD COLUMN IF NOT EXISTS` for `version` and don't recreate it; add `ai_events`, `ai_decisions` new tables with **GRANTs + RLS + admin-only policies** per project rules; seed missing agents with `ON CONFLICT DO NOTHING`).

TS files follow the blueprint shape but adjusted for our stack:
- Import path `@/integrations/supabase/client` (not `@/lib/supabase`).
- `AIAgent.execute` typed; `AgentRegistry`, `routeEvent`, `DecisionEngine`, `SunEngine.ignite()` as specified.
- No auto-run `sun.ignite()` at import time — expose it via a `createServerFn` wrapper for the admin dashboard trigger (avoids running on every client bundle load and keeps secrets server-side).

### 2) Bridge to existing Phoenix `agent_events`
A tiny adapter (`src/ai/core/phoenix-bridge.ts`, server-only via `.server.ts` naming) that:
- Mirrors new `ai_events` inserts into `agent_events` (fire-and-forget) so existing consumers keep working.
- Lets `event-consumer.ts` continue as-is; no behavior removed.

### 3) Deprecate old sun-core cleanly (no code deletion this turn)
- Leave `src/ai/sun-core/*` and `/admin-sun-core` route intact.
- Add a short `README.md` in `src/ai/sun-core/` marking it as **legacy** and pointing to `src/ai/core/`.
- Migration of the dashboard + `event-consumer.ts` fallback to the new core is scheduled for **PHASE 1.2** (next turn) to keep this turn small and reviewable.

### 4) Verification
- `bun run build:dev` → must exit 0.
- `bunx vitest run` for the two existing suites (sun-engine, inventory-intelligence) → still green.
- One new unit test: `src/__tests__/unit/ai-core/router.test.ts` covering the 3 seeded routes + default null.

### Out of scope (explicit)
- Neural Memory expansion, new agents implementations, Automation Engine, Security Guardian, Intelligence Center, Evolution Engine — those are later phases per the blueprint order.
- Deleting the legacy `sun-core` folder or its dashboard.
- Touching unrelated `.inputValidator` deprecation warnings.

### Technical notes
- **Import protection**: no file under `src/ai/core/` may import `client.server` at module scope; admin-only privileged reads go through `createServerFn` + `requireSupabaseAuth` with role check, loading `supabaseAdmin` inside the handler via `await import(...)`.
- **RLS**: `ai_events` / `ai_decisions` — `SELECT` for admins only (`has_role(auth.uid(),'admin')`), `INSERT` via `service_role` only. `GRANT SELECT` to `authenticated`, `GRANT ALL` to `service_role`, no `anon`.
- **Estimated diff**: ~8 new files, 1 migration, 2 edits (barrel + route path). Small, reviewable.
