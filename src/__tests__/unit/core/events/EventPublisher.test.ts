import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock idempotency service so we don't hit supabaseAdmin.
vi.mock("@/core/idempotency/IdempotencyService", () => {
  const store = new Map<string, boolean>();
  return {
    IdempotencyService: {
      check: vi.fn(async ({ scope, key }: { scope: string; key: string }) => {
        const k = `${scope}:${key}`;
        if (store.has(k)) {
          return {
            cached: new Response("{}", { status: 202 }),
            conflict: false,
          };
        }
        return { cached: null, conflict: false };
      }),
      store: vi.fn(async ({ scope, key }: { scope: string; key: string }) => {
        store.set(`${scope}:${key}`, true);
      }),
    },
  };
});

import { emit, registerHandler, clearRegistry, EVENTS } from "@/core/events";

describe("EventPublisher.emit", () => {
  beforeEach(() => clearRegistry());

  it("builds an envelope with defaults and dispatches", async () => {
    const seen: unknown[] = [];
    registerHandler(EVENTS.USER_REGISTERED, (payload, ctx) => {
      seen.push({ payload, envelope: ctx.envelope });
    });
    const result = await emit(EVENTS.USER_REGISTERED, { userId: "u1" }, {
      actorId: "u1",
    }, { skipDLQ: true });

    expect(result.envelope.name).toBe(EVENTS.USER_REGISTERED);
    expect(result.envelope.id).toBeTruthy();
    expect(result.envelope.occurredAt).toBeTruthy();
    expect(result.envelope.correlationId).toBeTruthy();
    expect(result.envelope.actorId).toBe("u1");
    expect(seen).toHaveLength(1);
    expect(result.handlerResults[0].ok).toBe(true);
  });

  it("short-circuits duplicate emits with idempotency key", async () => {
    let invocations = 0;
    registerHandler(EVENTS.ORDER_CREATED, () => {
      invocations += 1;
    });
    const key = `test-${Date.now()}`;
    const first = await emit(EVENTS.ORDER_CREATED, { id: "o1" }, {
      idempotencyKey: key,
    }, { skipDLQ: true });
    // small delay to let fire-and-forget store settle
    await new Promise((r) => setTimeout(r, 10));
    const second = await emit(EVENTS.ORDER_CREATED, { id: "o1" }, {
      idempotencyKey: key,
    }, { skipDLQ: true });

    expect(first.handlerResults).toHaveLength(1);
    expect(second.handlerResults).toHaveLength(0);
    expect(invocations).toBe(1);
  });
});
