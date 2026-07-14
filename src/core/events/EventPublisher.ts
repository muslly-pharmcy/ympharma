// ============================================================
// EventPublisher — build envelope, guard idempotency, dispatch
// ============================================================
import { logger } from "@/core/observability/Logger";
import { dispatch, type DispatcherOptions } from "./EventDispatcher";
import type { DispatchResult, EmitContext, EventEnvelope } from "./types";

function uuid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  );
}

export interface PublisherOptions extends DispatcherOptions {
  /** disables the persisted idempotency guard (tests / fire-and-forget). */
  skipIdempotency?: boolean;
}

export async function emit<TPayload>(
  name: string,
  payload: TPayload,
  ctx: EmitContext = {},
  opts: PublisherOptions = {},
): Promise<DispatchResult> {
  const envelope: EventEnvelope<TPayload> = {
    id: uuid(),
    name,
    occurredAt: new Date().toISOString(),
    orgId: ctx.orgId ?? null,
    actorId: ctx.actorId ?? null,
    correlationId: ctx.correlationId ?? uuid(),
    causationId: ctx.causationId ?? null,
    idempotencyKey: ctx.idempotencyKey ?? null,
    payload,
  };

  const log = logger.child({
    component: "event-bus",
    event_id: envelope.id,
    event_name: envelope.name,
    correlation_id: envelope.correlationId,
    org_id: envelope.orgId,
    actor_id: envelope.actorId,
  });

  if (envelope.idempotencyKey && !opts.skipIdempotency) {
    try {
      const { IdempotencyService } = await import(
        "@/core/idempotency/IdempotencyService"
      );
      const check = await IdempotencyService.check({
        scope: `event:${envelope.name}`,
        key: envelope.idempotencyKey,
      });
      if (check.cached || check.conflict) {
        log.info("event.idempotent_skip", { conflict: check.conflict });
        return { envelope, handlerResults: [] };
      }
      // Store a lightweight marker so repeat emits skip. Fire-and-forget.
      void IdempotencyService.store({
        scope: `event:${envelope.name}`,
        key: envelope.idempotencyKey,
        status: 202,
        body: { eventId: envelope.id },
      }).catch(() => void 0);
    } catch (err) {
      log.warn("event.idempotency_check_failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("event.emit", {});
  return dispatch(envelope as EventEnvelope, opts);
}

export const EventPublisher = { emit };
