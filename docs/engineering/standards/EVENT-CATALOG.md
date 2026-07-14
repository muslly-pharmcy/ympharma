# Event Catalog (Phoenix Phase 2)

Canonical event names live in `src/core/events/constants.ts`. Payload schemas are defined per-module under `modules/<name>/events/`. This catalog is the human index.

## Envelope

Every event carries:

| Field           | Type              | Notes                              |
| --------------- | ----------------- | ---------------------------------- |
| `id`            | uuid              | envelope id                        |
| `name`          | string            | canonical name (see below)         |
| `occurredAt`    | ISO-8601          | producer timestamp                 |
| `orgId`         | uuid \| null      | tenant scope                       |
| `actorId`       | uuid \| null      | user that triggered the event      |
| `correlationId` | uuid              | inherits from RequestContext       |
| `causationId`   | uuid \| null      | envelope id that caused this event |
| `idempotencyKey`| string \| null    | dedupe token                       |
| `payload`       | module-defined    | see per-event schema               |

## Registered names

| Name                       | Producer (planned)   | Consumers (planned)                   |
| -------------------------- | -------------------- | ------------------------------------- |
| `order.created`            | commerce             | inventory, notifications              |
| `order.cancelled`          | commerce             | inventory, notifications              |
| `payment.completed`        | commerce             | orders, notifications                 |
| `payment.failed`           | commerce             | orders, notifications                 |
| `inventory.updated`        | commerce             | product-intelligence, notifications   |
| `inventory.low_stock`      | commerce             | notifications, procurement            |
| `prescription.received`    | clinical             | pharmacist, ai-copilot, notifications |
| `prescription.approved`    | clinical             | commerce, notifications               |
| `user.registered`          | auth                 | notifications, growth-engine          |
| `user.invited`             | auth                 | notifications                         |

Producers/consumers are indicative — wiring happens in Phase 3+. Adding a new event: append to `constants.ts`, define a Zod schema in the owning module, update this table in the same PR.
