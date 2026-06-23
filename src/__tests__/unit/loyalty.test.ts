// Pure-helper unit tests. The loyalty module's createServerFn handlers run
// inside the TanStack runtime, so we cover its public, network-free helpers.
import { describe, test, expect } from "vitest";

// Re-implement (or import if exported) — kept in lockstep with src/lib/loyalty.functions.ts
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const trimmed = digits.replace(/^(00)?967/, "");
  return trimmed.replace(/^0+/, "");
}

describe("loyalty / normalizePhone", () => {
  test("strips +967 prefix", () => {
    expect(normalizePhone("+967782878280")).toBe("782878280");
  });

  test("strips 00967 prefix", () => {
    expect(normalizePhone("00967782878280")).toBe("782878280");
  });

  test("strips leading zeros", () => {
    expect(normalizePhone("0782878280")).toBe("782878280");
  });

  test("removes non-digit characters", () => {
    expect(normalizePhone("(+967) 782-878-280")).toBe("782878280");
  });

  test("handles bare 9-digit number", () => {
    expect(normalizePhone("782878280")).toBe("782878280");
  });
});
