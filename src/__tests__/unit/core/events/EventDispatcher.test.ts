import { describe, it, expect, beforeEach } from "vitest";
import { dispatch } from "@/core/events/EventDispatcher";
import { registerHandler, clearRegistry } from "@/core/events/EventRegistry";
import type { EventEnvelope } from "@/core/events/types";

function envelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    id: "evt-1",
    name: "test.event",
    occurredAt: new Date().toISOString(),
    orgId: null,
    actorId: null,
    correlationId: "corr-1",
    causationId: null,
    idempotencyKey: null,
    payload: { hello: "world" },
    ...overrides,
  };
}

describe("EventDispatcher", () => {
  beforeEach(() => clearRegistry());

  it("returns empty when no handlers", async () => {
    const res = await dispatch(envelope(), { skipDLQ: true });
    expect(res.handlerResults).toEqual([]);
  });

  it("runs multiple handlers and isolates failures", async () => {
    let okCount = 0;
    registerHandler("test.event", () => {
      okCount += 1;
    }, { name: "handler-a", retries: 0 });
    registerHandler("test.event", () => {
      throw new Error("boom");
    }, { name: "handler-b", retries: 0 });
    registerHandler("test.event", () => {
      okCount += 1;
    }, { name: "handler-c", retries: 0 });

    const res = await dispatch(envelope(), { skipDLQ: true });
    expect(okCount).toBe(2);
    const map = Object.fromEntries(res.handlerResults.map((r) => [r.handler, r]));
    expect(map["handler-a"].ok).toBe(true);
    expect(map["handler-b"].ok).toBe(false);
    expect(map["handler-b"].error).toContain("boom");
    expect(map["handler-c"].ok).toBe(true);
  });

  it("retries transient failures then succeeds", async () => {
    let attempts = 0;
    registerHandler("test.event", () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
    }, { name: "flaky", retries: 3, baseDelayMs: 1 });

    const res = await dispatch(envelope(), { skipDLQ: true });
    expect(attempts).toBe(3);
    expect(res.handlerResults[0].ok).toBe(true);
    expect(res.handlerResults[0].attempts).toBe(3);
  });
});
