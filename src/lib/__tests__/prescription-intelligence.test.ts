import { describe, it, expect, vi } from "vitest";
import {
  matchExtractedMedicines,
  type ProductLookupFn,
  type ProductLookupResult,
} from "@/lib/prescription-intelligence.server";

function makeLookup(map: Record<string, ProductLookupResult>): ProductLookupFn {
  return vi.fn(async (name: string) => {
    // Match by case-insensitive substring against keys (mimics ILIKE %name%)
    const key = Object.keys(map).find((k) => k.toLowerCase().includes(name.toLowerCase()));
    return key ? map[key] : null;
  });
}

describe("matchExtractedMedicines", () => {
  it("returns isValid:false when extraction itself is invalid", async () => {
    const result = await matchExtractedMedicines(
      { isValid: false, notes: "blurry", medicines: [] },
      vi.fn(),
    );
    expect(result.isValid).toBe(false);
    expect(result.medicines).toEqual([]);
    expect(result.missingMedicines).toEqual([]);
  });

  it("returns isValid:false when medicines list is empty even if isValid=true", async () => {
    const result = await matchExtractedMedicines(
      { isValid: true, notes: null, medicines: [] },
      vi.fn(),
    );
    expect(result.isValid).toBe(false);
  });

  it("maps in-stock products correctly and exposes stock + price", async () => {
    const lookup = makeLookup({
      "Panadol Extra 500mg": { id: "p1", name: "Panadol Extra 500mg", stock_qty: 12, price: 850 },
    });
    const result = await matchExtractedMedicines(
      {
        isValid: true,
        notes: "",
        medicines: [{ name: "Panadol", dosage: "500mg", frequency: "x2", confidence: 0.9 }],
      },
      lookup,
    );
    expect(result.isValid).toBe(true);
    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0]).toMatchObject({
      matchedProductId: "p1",
      matchedProductName: "Panadol Extra 500mg",
      inStock: true,
      stockQty: 12,
      priceYer: 850,
      dosage: "500mg",
      frequency: "x2",
      confidence: 0.9,
    });
    expect(result.missingMedicines).toEqual([]);
  });

  it("flags as missing when product is not found", async () => {
    const lookup = makeLookup({});
    const result = await matchExtractedMedicines(
      { isValid: true, notes: null, medicines: [{ name: "Unknownol" }] },
      lookup,
    );
    expect(result.medicines[0].inStock).toBe(false);
    expect(result.medicines[0].matchedProductId).toBeNull();
    expect(result.missingMedicines).toEqual(["Unknownol"]);
  });

  it("flags as missing when product exists but stock_qty=0", async () => {
    const lookup = makeLookup({
      "Amoxil 250mg": { id: "p2", name: "Amoxil 250mg", stock_qty: 0, price: 400 },
    });
    const result = await matchExtractedMedicines(
      { isValid: true, notes: null, medicines: [{ name: "Amoxil" }] },
      lookup,
    );
    expect(result.medicines[0].inStock).toBe(false);
    expect(result.medicines[0].matchedProductId).toBe("p2");
    expect(result.missingMedicines).toEqual(["Amoxil"]);
  });

  it("handles mixed in-stock and missing across multiple medicines", async () => {
    const lookup = makeLookup({
      "Panadol Extra": { id: "p1", name: "Panadol Extra", stock_qty: 5, price: 700 },
      "Brufen 400": { id: "p2", name: "Brufen 400", stock_qty: 0, price: 500 },
    });
    const result = await matchExtractedMedicines(
      {
        isValid: true,
        notes: "",
        medicines: [
          { name: "Panadol" },
          { name: "Brufen" },
          { name: "MissingMed" },
        ],
      },
      lookup,
    );
    expect(result.medicines).toHaveLength(3);
    expect(result.medicines[0].inStock).toBe(true);
    expect(result.medicines[1].inStock).toBe(false);
    expect(result.medicines[2].matchedProductId).toBeNull();
    expect(result.missingMedicines).toEqual(["Brufen", "MissingMed"]);
  });

  it("defaults confidence to 0.5 when omitted", async () => {
    const lookup = makeLookup({
      "Vitamin C": { id: "v1", name: "Vitamin C", stock_qty: 100, price: 200 },
    });
    const result = await matchExtractedMedicines(
      { isValid: true, notes: null, medicines: [{ name: "Vitamin" }] },
      lookup,
    );
    expect(result.medicines[0].confidence).toBe(0.5);
  });

  it("preserves notes when valid", async () => {
    const result = await matchExtractedMedicines(
      { isValid: true, notes: "تم استخراج الأدوية", medicines: [{ name: "X" }] },
      makeLookup({}),
    );
    expect(result.notes).toBe("تم استخراج الأدوية");
  });
});
