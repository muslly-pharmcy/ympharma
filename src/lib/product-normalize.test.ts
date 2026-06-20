// Unit tests for product name normalization. Vitest.
import { describe, it, expect } from "vitest";
import { extractDosages, normalizeProductKey } from "@/lib/product-normalize";

describe("extractDosages", () => {
  it("extracts mg / mcg / ml / iu", () => {
    expect(extractDosages("Vitamin B12 1000 mcg")).toEqual(["1000mcg"]);
    expect(extractDosages("جنكة بيلوبا 120 mg")).toEqual(["120mg"]);
    expect(extractDosages("شراب 100 مل")).toEqual([]); // Arabic "مل" not recognized (require latin units)
    expect(extractDosages("Vitamin D 5000 IU")).toEqual(["5000iu"]);
    expect(extractDosages("Cream 5%")).toEqual(["5%"]);
  });

  it("normalizes unit aliases", () => {
    expect(extractDosages("X 100 µg")).toEqual(["100mcg"]);
    expect(extractDosages("X 10 cc")).toEqual(["10ml"]);
    expect(extractDosages("X 1 gm")).toEqual(["1g"]);
  });

  it("handles Arabic-Indic digits", () => {
    expect(extractDosages("جنكة ١٢٠ mg")).toEqual(["120mg"]);
  });

  it("returns multiple tokens sorted", () => {
    expect(extractDosages("Combo 500mg + 200mg")).toEqual(["200mg", "500mg"]);
  });
});

describe("normalizeProductKey", () => {
  it("groups same-dose products together", () => {
    const a = normalizeProductKey("جنكة بيلوبا 120 mg");
    const b = normalizeProductKey("جنكه بيلوبا 120mg");
    expect(a.key).toEqual(b.key);
  });

  it("DOES NOT merge different doses (regression: 120mg vs 60mg)", () => {
    const a = normalizeProductKey("جنكة بيلوبا 120 mg");
    const b = normalizeProductKey("جنكة بيلوبا 60 mg");
    expect(a.key).not.toEqual(b.key);
  });

  it("DOES NOT merge different units (mg vs mcg)", () => {
    const a = normalizeProductKey("X 100 mg");
    const b = normalizeProductKey("X 100 mcg");
    expect(a.key).not.toEqual(b.key);
  });

  it("groups products with no dosage by name only", () => {
    const a = normalizeProductKey("Probiotic 25 Billion");
    const b = normalizeProductKey("probiotic  25  billion");
    expect(a.key).toEqual(b.key);
  });
});
