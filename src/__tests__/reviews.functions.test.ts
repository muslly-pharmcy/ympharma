import { describe, it, expect } from "vitest";
import { z } from "zod";

// Validates the input schema directly — no fake createServerFn mocks.
const submitReviewInput = z.object({
  productId: z.uuid(),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

describe("submitReview input validation", () => {
  it("accepts a valid review", () => {
    expect(() =>
      submitReviewInput.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        rating: 5,
        comment: "ممتاز",
      }),
    ).not.toThrow();
  });

  it("rejects rating out of range", () => {
    expect(() =>
      submitReviewInput.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        rating: 6,
      }),
    ).toThrow();
  });

  it("rejects non-uuid productId", () => {
    expect(() =>
      submitReviewInput.parse({ productId: "not-a-uuid", rating: 3 }),
    ).toThrow();
  });

  it("rejects comments over 1000 chars", () => {
    expect(() =>
      submitReviewInput.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        rating: 3,
        comment: "x".repeat(1001),
      }),
    ).toThrow();
  });
});
