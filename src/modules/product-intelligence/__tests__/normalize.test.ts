import { describe, it, expect } from "vitest";
import { normalize, tokenize, canonicalQuery } from "../domain/normalize";

describe("normalize", () => {
  it("folds Arabic letter variants", () => {
    expect(normalize("أَحْمَد")).toBe("احمد");
    expect(normalize("مُسْتَشْفَى")).toBe("مستشفي");
    expect(normalize("قَلْبِيّة")).toBe("قلبيه");
  });
  it("strips tashkeel + tatweel + zero-width", () => {
    expect(normalize("فِيــتَامِين\u200B")).toBe("فيتامين");
  });
  it("collapses whitespace and lowercases latin", () => {
    expect(normalize("  Vitamin   C  ")).toBe("vitamin c");
  });
  it("returns empty for null/empty", () => {
    expect(normalize(null)).toBe("");
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });
  it("handles mixed script", () => {
    expect(normalize("Vit سي")).toBe("vit سي");
  });
});

describe("tokenize / canonicalQuery", () => {
  it("maps misspelled Arabic to canonical", () => {
    expect(tokenize("فتمين")).toEqual(["vitamin"]);
    expect(tokenize("فتامين")).toEqual(["vitamin"]);
    expect(tokenize("بنادول")).toEqual(["panadol"]);
  });
  it("folds bigrams", () => {
    expect(canonicalQuery("vit c")).toBe("vitamin_c");
    expect(canonicalQuery("vitamin d")).toBe("vitamin_d");
  });
  it("maps فتمين سي to vitamin_c", () => {
    expect(canonicalQuery("فتمين سي")).toBe("vitamin_c");
  });
});
