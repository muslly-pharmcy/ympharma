import { describe, it, expect } from "vitest";
import { normalizeYemenPhone } from "./phone-normalize";

describe("normalizeYemenPhone — mirrors SQL trigger logic", () => {
  const cases: Array<[string | null | undefined, string | null]> = [
    ["00967777123456", "967777123456"],
    ["+967777123456", "967777123456"],
    ["967777123456", "967777123456"],
    ["0777123456", "967777123456"],   // local 10-digit with leading 0
    ["777123456", "967777123456"],     // 9-digit bare
    ["  +967-777 123 456  ", "967777123456"],
    ["abc", null],
    ["", null],
    [null, null],
    [undefined, null],
    ["12345", null],
  ];
  it.each(cases)("normalize(%s) -> %s", (input, expected) => {
    expect(normalizeYemenPhone(input)).toBe(expected);
  });

  it("idempotent: normalize(normalize(x)) === normalize(x)", () => {
    for (const [input] of cases) {
      const a = normalizeYemenPhone(input);
      const b = a ? normalizeYemenPhone(a) : null;
      expect(b).toBe(a);
    }
  });
});
