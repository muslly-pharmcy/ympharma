import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  toApiErrorBody,
} from "@/core/errors";

describe("AppError", () => {
  it("assigns code + status + user message", () => {
    const err = new NotFoundError("Order missing", "id=123 not in DB");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.httpStatus).toBe(404);
    expect(err.userMessage).toBe("Order missing");
    expect(err.devDetail).toBe("id=123 not in DB");
  });

  it("serializer surfaces user message + code", () => {
    const err = new ValidationError("Bad input", { issues: [] });
    const { status, body } = toApiErrorBody(err);
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Bad input");
    expect(body.error.meta).toEqual({ issues: [] });
  });

  it("wraps unknown errors as INTERNAL", () => {
    const { status, body } = toApiErrorBody(new Error("kaboom"));
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("kaboom"); // user-safe
  });

  it("extends Error", () => {
    expect(new AppError({
      code: "INTERNAL",
      httpStatus: 500,
      userMessage: "x",
    })).toBeInstanceOf(Error);
  });
});
