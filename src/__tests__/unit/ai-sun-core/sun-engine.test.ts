import { describe, it, expect } from "vitest";
import { routeEvent, findAgentsForEvent, classifyForAgent } from "@/ai/sun-core";

describe("Sun Core routing", () => {
  it("routes PrescriptionUploaded to pharmacist with high priority", () => {
    const r = routeEvent("PrescriptionUploaded");
    expect(r.agents).toContain("pharmacist");
    expect(r.priority).toBe("high");
  });

  it("routes STOCK_RECEIVED to inventory", () => {
    expect(findAgentsForEvent("STOCK_RECEIVED")).toContain("inventory");
  });

  it("routes SecurityAlert to security_guardian as critical", () => {
    const r = routeEvent("SecurityAlert");
    expect(r.agents).toContain("security_guardian");
    expect(r.priority).toBe("critical");
  });

  it("unknown event yields no agents and low priority", () => {
    const r = routeEvent("FooBar_Unknown");
    expect(r.agents).toEqual([]);
    expect(r.priority).toBe("low");
  });

  it("classifyForAgent produces action + confidence", () => {
    const d = classifyForAgent("pharmacist", "PrescriptionUploaded", { rxId: "x" });
    expect(d.action).toBe("review_prescription");
    expect(d.confidence).toBeGreaterThan(50);
  });
});
