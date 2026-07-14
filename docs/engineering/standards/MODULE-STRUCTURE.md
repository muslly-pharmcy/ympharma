# Module Structure Standard (Phoenix Phase 2)

Every business module lives under `src/modules/<name>/` and follows this layout.

## Layout

```
modules/<name>/
  domain/     types, Zod schemas, pure business rules
  data/       supabase queries & data-access
  server/     server functions & service logic (*.functions.ts, *.server.ts)
  ui/         React components scoped to this module
  events/     event names, payload schemas, publisher & consumer wiring
  index.ts    PUBLIC export barrel — the ONLY file other modules may import
  README.md
```

## Rules (enforced by `scripts/check-imports.ts`)

- **R1** — `src/core/**` MUST NOT import from `src/modules/**` or `src/platform/**`.
- **R2** — `src/platform/**` MUST NOT import from `src/modules/**`.
- **R3** — `src/modules/<A>/**` MUST NOT import internal files of `src/modules/<B>/**`. Cross-module reads go through `@/modules/<B>` (the public `index.ts`) or through the event bus at `@/core/events`.

## Cross-module communication

Prefer events for side-effects and workflow triggers:

```ts
import { emit, EVENTS } from "@/core/events";
await emit(EVENTS.ORDER_CREATED, payload, { orgId, actorId });
```

Prefer public reads via the module barrel for synchronous data lookups:

```ts
import { getProductById } from "@/modules/catalog";
```

## Public export rule

Only re-export from `index.ts` what other modules genuinely need. Everything else stays module-private.

## Server boundaries

- Files ending in `*.server.ts(x)` cannot be imported from client-reachable code.
- Server functions live in `*.functions.ts` under `server/`, thin (`createServerFn` declarations + client-safe imports). Heavy logic imports from a `.server.ts` sibling via `await import()` inside the handler.
