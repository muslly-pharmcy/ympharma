import { describe, it, expect } from "vitest";
import { routeEvent } from "@/ai/core/event-router";

describe("ai/core/event-router", () => {
  it("routes PRESCRIPTION_UPLOADED to pharmacist_agent", () => {
    expect(
      routeEvent({ event_type: "PRESCRIPTION_UPLOADED", source: "test", payload: {} }),
    ).toBe("pharmacist_agent");
  });

  it("routes stock/inventory family to inventory_agent", () => {
    for (const type of ["STOCK_LOW", "LOW_STOCK_PREDICTED", "PURCHASE_RECOMMENDED", "DEAD_STOCK_DETECTED"]) {
      expect(routeEvent({ event_type: type, source: "test", payload: {} })).toBe("inventory_agent");
    }
  });

  it("routes customer messages to customer_agent", () => {
    expect(routeEvent({ event_type: "CUSTOMER_MESSAGE", source: "test", payload: {} })).toBe(
      "customer_agent",
    );
    expect(routeEvent({ event_type: "WHATSAPP_INBOUND", source: "test", payload: {} })).toBe(
      "customer_agent",
    );
  });

  it("returns null for unknown event type", () => {
    expect(routeEvent({ event_type: "UNKNOWN_XYZ", source: "test", payload: {} })).toBeNull();
  });

  it("honors explicit target_agent override", () => {
    expect(
      routeEvent({
        event_type: "UNKNOWN_XYZ",
        source: "test",
        payload: {},
        target_agent: "custom_agent",
      }),
    ).toBe("custom_agent");
  });
});
