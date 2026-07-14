// ============================================================
// EventDispatcher — executes handlers with isolation, retry, DLQ
// ============================================================
import { withRetry } from "@/lib/retry";
import { logger } from "@/core/observability/Logger";
import { getHandlers } from "./EventRegistry";
import type { DispatchResult, EventEnvelope } from "./types";

export interface DispatcherOptions {
  /** override handler retries for tests */
  retries?: number;
  /** skip DLQ sink (tests) */
  skipDLQ?: boolean;
}

export async function dispatch(
  envelope: EventEnvelope,
  opts: DispatcherOptions = {},
): Promise<DispatchResult> {
  const handlers = getHandlers(envelope.name);
  const log = logger.child({
    component: "event-bus",
    event_id: envelope.id,
    event_name: envelope.name,
    correlation_id: envelope.correlationId,
    org_id: envelope.orgId,
    actor_id: envelope.actorId,
  });

  if (handlers.length === 0) {
    log.debug("event.no_handlers");
    return { envelope, handlerResults: [] };
  }

  const results = await Promise.allSettled(
    handlers.map(async (h) => {
      let attempts = 0;
      try {
        await withRetry(
          async () => {
            attempts += 1;
            await h.handler(envelope.payload, { envelope, attempt: attempts });
          },
          {
            retries: opts.retries ?? h.options.retries,
            baseDelayMs: h.options.baseDelayMs,
            shouldRetry: () => true,
            onRetry: (err, attempt, delay) =>
              log.warn("handler.retry", {
                handler: h.options.name,
                attempt,
                delay_ms: Math.round(delay),
                err: err instanceof Error ? err.message : String(err),
              }),
          },
        );
        return { handler: h.options.name, ok: true, attempts };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("handler.failed", { handler: h.options.name, attempts, err: message });
        let sentToDLQ = false;
        if (!opts.skipDLQ) {
          try {
            const { sendToDLQ } = await import("./eventDlqSink.server");
            await sendToDLQ(envelope, h.options.name, message, attempts);
            sentToDLQ = true;
          } catch (dlqErr) {
            log.error("handler.dlq_failed", {
              handler: h.options.name,
              err: dlqErr instanceof Error ? dlqErr.message : String(dlqErr),
            });
          }
        }
        return {
          handler: h.options.name,
          ok: false,
          attempts,
          error: message,
          sentToDLQ,
        };
      }
    }),
  );

  return {
    envelope,
    handlerResults: results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { handler: "unknown", ok: false, attempts: 0, error: String(r.reason) },
    ),
  };
}
