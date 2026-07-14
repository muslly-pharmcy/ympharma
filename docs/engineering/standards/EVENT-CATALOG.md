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
| `USER_CREATED`             | identity (DB trigger)| notifications, growth-engine          |
| `USER_UPDATED`             | identity (DB trigger)| notifications, audit                  |
| `PROFILE_COMPLETED`        | identity (DB trigger)| notifications, growth-engine          |
| `ORGANIZATION_MEMBER_ADDED`| identity (DB trigger)| notifications, audit                  |
| `ORGANIZATION_MEMBER_REMOVED`| identity (DB trigger)| notifications, audit                |
| `ROLE_CHANGED`             | identity (DB trigger)| notifications, audit, permissions     |
| `BRANCH_CREATED`           | identity (DB trigger)| audit, inventory (future)             |
| `BRANCH_UPDATED`           | identity (DB trigger)| audit                                 |
| `BRANCH_MEMBER_ASSIGNED`   | identity (DB trigger)| notifications, audit                  |
| `BRANCH_MEMBER_UNASSIGNED` | identity (DB trigger)| notifications, audit                  |

Producers/consumers are indicative — wiring extends per phase. Adding a new event: append to `constants.ts`, define a Zod schema in the owning module, update this table in the same PR.
