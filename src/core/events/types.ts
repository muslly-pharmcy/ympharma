// ============================================================
// Event Bus — Type contracts
// ============================================================
// Client-safe (no server-only imports). Handlers may be async.

export interface EventEnvelope<TPayload = unknown> {
  id: string;                      // uuid v4
  name: string;                    // canonical event name (see constants.ts)
  occurredAt: string;              // ISO-8601
  orgId: string | null;
  actorId: string | null;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string | null;
  payload: TPayload;
}

export interface EmitContext {
  orgId?: string | null;
  actorId?: string | null;
  correlationId?: string;
  causationId?: string | null;
  idempotencyKey?: string | null;
}

export interface HandlerContext {
  envelope: EventEnvelope;
  attempt: number;
}

export type EventHandler<TPayload = unknown> = (
  payload: TPayload,
  ctx: HandlerContext,
) => Promise<void> | void;

export interface HandlerOptions {
  retries?: number;         // default 3
  baseDelayMs?: number;     // default 300
  name?: string;            // handler label for logs
}

export interface RegisteredHandler {
  eventName: string;
  handler: EventHandler;
  options: Required<Pick<HandlerOptions, "retries" | "baseDelayMs" | "name">>;
}

export interface DispatchResult {
  envelope: EventEnvelope;
  handlerResults: Array<{
    handler: string;
    ok: boolean;
    attempts: number;
    error?: string;
    sentToDLQ?: boolean;
  }>;
}
