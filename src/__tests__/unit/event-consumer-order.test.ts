// Verifies the OrderCreated handler in event-consumer:
//   1) calls reserve_order_stock with the real payload shape (entity_id,
//      actor, reason);
//   2) returns ok on a successful reservation;
//   3) calls release_order_stock as Saga compensation when reserve returns
//      ok:false;
//   4) routes unknown events to DLQ immediately (dlqNow flag).
import { describe, it, expect, vi } from "vitest";
import { handleEvent } from "@/routes/api/public/hooks/event-consumer";

type RpcCall = { fn: string; args: Record<string, unknown> };

function makeAdmin(rpcImpl: (fn: string, args: Record<string, unknown>) => unknown) {
  const calls: RpcCall[] = [];
  const admin = {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      const data = rpcImpl(fn, args);
      return { data, error: null };
    }),
  };
  return { admin, calls };
}

const baseEvent = {
  id: "11111111-1111-1111-1111-111111111111",
  event_name: "OrderCreated",
  entity_type: "order",
  entity_id: "AM-DE9903A54B72",
  payload: { total: 8700, customer_phone: "774068936" },
  source: "test",
  occurred_at: new Date().toISOString(),
  retry_count: 0,
};

describe("event-consumer OrderCreated handler", () => {
  it("calls reserve_order_stock with the order id and returns ok on success", async () => {
    const { admin, calls } = makeAdmin((fn) =>
      fn === "reserve_order_stock" ? { ok: true, order_id: baseEvent.entity_id } : null,
    );

    const res = await handleEvent(baseEvent, admin);
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe("reserve_order_stock");
    expect(calls[0].args).toEqual({
      _order_id: "AM-DE9903A54B72",
      _actor: "event_consumer",
      _reason: "order_created",
    });
  });

  it("treats a skipped (already-reserved) result as ok and does NOT compensate", async () => {
    const { admin, calls } = makeAdmin((fn) =>
      fn === "reserve_order_stock" ? { ok: true, skipped: true, reason: "already_reserved" } : null,
    );

    const res = await handleEvent(baseEvent, admin);
    expect(res.ok).toBe(true);
    expect(calls.map((c) => c.fn)).toEqual(["reserve_order_stock"]);
  });

  it("runs release_order_stock as Saga compensation when reserve returns ok:false", async () => {
    const { admin, calls } = makeAdmin((fn) => {
      if (fn === "reserve_order_stock") return { ok: false, error: "insufficient_stock" };
      if (fn === "release_order_stock") return { ok: true, skipped: true, reason: "never_reserved" };
      return null;
    });

    const res = await handleEvent(baseEvent, admin);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("reserve_failed");

    expect(calls.map((c) => c.fn)).toEqual(["reserve_order_stock", "release_order_stock"]);
    expect(calls[1].args).toEqual({
      _order_id: "AM-DE9903A54B72",
      _actor: "event_consumer",
      _reason: "saga_compensation",
    });
  });

  it("returns dlqNow=true when OrderCreated has no entity_id", async () => {
    const { admin, calls } = makeAdmin(() => null);
    const res = await handleEvent({ ...baseEvent, entity_id: null }, admin);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.dlqNow).toBe(true);
      expect(res.error).toBe("order_created_missing_entity_id");
    }
    expect(calls).toHaveLength(0);
  });

  it("routes unknown event names to DLQ immediately", async () => {
    const { admin } = makeAdmin(() => null);
    const res = await handleEvent({ ...baseEvent, event_name: "SomethingNobodyHandles" }, admin);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.dlqNow).toBe(true);
      expect(res.error).toContain("unknown_event:SomethingNobodyHandles");
    }
  });
});
