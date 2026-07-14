import { describe, it, expect } from "vitest";
import { buildAliasCandidates, compareHits, scoreMatch } from "../domain/aliases";
import type { MatchKind } from "../domain/aliases";

describe("buildAliasCandidates", () => {
  it("returns normalized + canonical + tokens", () => {
    const c = buildAliasCandidates("فتمين سي");
    expect(c.normalized).toBe("فتمين سي");
    expect(c.canonical).toBe("vitamin_c");
    expect(c.tokens).toEqual(["vitamin_c"]);
  });
  it("handles empty input", () => {
    const c = buildAliasCandidates("");
    expect(c.tokens).toEqual([]);
    expect(c.canonical).toBe("");
  });
  it("groups Panadol variants", () => {
    expect(buildAliasCandidates("بنادول").canonical).toBe("panadol");
    expect(buildAliasCandidates("باندول").canonical).toBe("panadol");
    expect(buildAliasCandidates("Panadol").canonical).toBe("panadol");
  });
});

describe("compareHits + scoreMatch", () => {
  const mk = (kind: MatchKind, score: number) => ({
    id: kind + score, match_kind: kind, score,
  });
  it("ranks exact > alias > fuzzy", () => {
    const hits = [mk("fuzzy", 0.99), mk("alias", 0.5), mk("exact", 0.1)].sort(compareHits);
    expect(hits.map((h) => h.match_kind)).toEqual(["exact", "alias", "fuzzy"]);
  });
  it("scoreMatch stays within 0..1", () => {
    expect(scoreMatch("exact")).toBe(1);
    expect(scoreMatch("fuzzy", 0.5)).toBeCloseTo(0.35, 5);
    expect(scoreMatch("alias_fuzzy", 2)).toBe(0.65);
  });
});
