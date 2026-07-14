# Modules

Business domains live here as independently deployable modules. Empty by design in Phoenix Phase 2 — migration begins in Phase 3.

## Required layout (every module)

```
modules/<name>/
  domain/     — types, Zod schemas, business rules (pure, no I/O)
  data/       — data-access + read/query functions
  server/     — server functions, service logic (may import from data/)
  ui/         — module-scoped React components
  events/     — event names + payload schemas + publisher/consumer wiring
  index.ts    — PUBLIC export barrel (the only file other modules import from)
  README.md
```

## Cross-module rules (enforced by scripts/check-imports.ts)

1. A module MUST NOT import from another module's internal files. Cross-module reads go through `modules/<other>/index.ts` OR through the event bus.
2. `src/core/**` MUST NOT import from `src/modules/**` or `src/platform/**`.
3. `src/platform/**` MUST NOT import from `src/modules/**`.
4. Cross-module writes/side-effects flow through `@/core/events` (`emit` / `registerHandler`).

See `docs/engineering/standards/MODULE-STRUCTURE.md` for the full contract.
