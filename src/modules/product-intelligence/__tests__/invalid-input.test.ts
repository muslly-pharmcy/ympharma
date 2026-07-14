import { describe, it, expect } from "vitest";
import { normalize, tokenize } from "../domain/normalize";
import { buildAliasCandidates } from "../domain/aliases";

describe("invalid / edge inputs", () => {
  it("null and undefined", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
    expect(tokenize(undefined)).toEqual([]);
  });
  it("very long input does not crash", () => {
    const long = "فتمين ".repeat(500);
    const c = buildAliasCandidates(long);
    expect(c.tokens.length).toBeGreaterThan(100);
    expect(c.tokens.every((t) => t === "vitamin")).toBe(true);
  });
  it("emojis and punctuation are stripped", () => {
    expect(normalize("Vitamin-C 💊!!")).toBe("vitamin c");
  });
  it("RTL control marks removed", () => {
    expect(normalize("\u202Eفيتامين\u202C")).toBe("فيتامين");
  });
});
