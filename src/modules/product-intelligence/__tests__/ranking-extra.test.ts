import { describe, it, expect } from "vitest";
import { canonicalQuery, tokenize } from "../domain/normalize";
import { compareHits } from "../domain/aliases";
import type { MatchKind } from "../domain/aliases";

describe("expanded canonical map", () => {
  it("maps chronic/cardio brand names", () => {
    expect(tokenize("جلوكوفاج")).toEqual(["glucophage"]);
    expect(tokenize("ليبيتور")).toEqual(["lipitor"]);
    expect(tokenize("كونكور")).toEqual(["concor"]);
    expect(tokenize("كوزار")).toEqual(["cozaar"]);
  });
  it("maps respiratory / allergy brands", () => {
    expect(tokenize("زيرتك")).toEqual(["zyrtec"]);
    expect(tokenize("فينتولين")).toEqual(["ventolin"]);
    expect(tokenize("كلاريتين")).toEqual(["claritin"]);
  });
  it("handles voltaren misspellings", () => {
    expect(tokenize("فولترين")).toEqual(["voltaren"]);
    expect(tokenize("فولتارين")).toEqual(["voltaren"]);
  });
  it("still resolves vitamin bigrams to canonical", () => {
    expect(canonicalQuery("فتمين سي")).toBe("vitamin_c");
    expect(canonicalQuery("فتامين دي")).toBe("vitamin_d");
    expect(canonicalQuery("vit b")).toBe("vitamin_b");
  });
});

describe("hit ranking tie-breakers", () => {
  const mk = (kind: MatchKind, score: number, id = kind + score) =>
    ({ id, match_kind: kind, score });
  it("higher score wins within same kind", () => {
    const sorted = [mk("alias", 0.3), mk("alias", 0.9), mk("alias", 0.6)].sort(compareHits);
    expect(sorted.map((h) => h.score)).toEqual([0.9, 0.6, 0.3]);
  });
  it("normalized beats alias when both present", () => {
    const sorted = [mk("alias", 1), mk("normalized", 0.5)].sort(compareHits);
    expect(sorted[0].match_kind).toBe("normalized");
  });
  it("mixed-script exact still ranks above fuzzy", () => {
    const sorted = [mk("fuzzy", 0.95), mk("exact", 0.1)].sort(compareHits);
    expect(sorted[0].match_kind).toBe("exact");
  });
});
