import { describe, it, expect } from "vitest";
import {
  computeHealth,
  recommendationUrgency,
  movingAverage,
  forecastUnits,
  expiryRisk,
} from "@/modules/inventory-intelligence";

describe("Inventory Intelligence — domain", () => {
  it("moving average", () => {
    expect(movingAverage([2, 4, 6])).toBe(4);
    expect(movingAverage([])).toBe(0);
  });

  it("forecast units multiplies avg by horizon", () => {
    expect(forecastUnits(3, 7)).toBe(21);
    expect(forecastUnits(2, 30)).toBe(60);
  });

  it("expiry risk climbs with near-dated batches", () => {
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const late = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    const r = expiryRisk([
      { qtyOnHand: 10, expiryDate: soon },
      { qtyOnHand: 10, expiryDate: late },
    ]);
    expect(r).toBeGreaterThan(0.3);
    expect(r).toBeLessThan(0.5);
  });

  it("critical when days of cover < 3", () => {
    const h = computeHealth({
      stockQty: 5,
      reorderThreshold: 10,
      velocityDaily: 3,
      expiryRisk: 0,
      marginPct: 0.4,
    });
    expect(h.status).toBe("critical");
    expect(h.daysOfCover).toBeCloseTo(1.67, 1);
  });

  it("healthy when well-stocked", () => {
    const h = computeHealth({
      stockQty: 200,
      reorderThreshold: 10,
      velocityDaily: 1,
      expiryRisk: 0,
      marginPct: 0.5,
    });
    expect(h.status).toBe("healthy");
  });

  it("recommendation urgency thresholds", () => {
    expect(recommendationUrgency(1)).toBe("critical");
    expect(recommendationUrgency(5)).toBe("high");
    expect(recommendationUrgency(10)).toBe("medium");
    expect(recommendationUrgency(20)).toBe("low");
    expect(recommendationUrgency(null)).toBe("low");
  });
});
