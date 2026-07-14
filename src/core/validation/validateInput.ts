import type { ZodType } from "zod";
import { ValidationError } from "@/core/errors/AppError";

export function validateInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));
    throw new ValidationError("Invalid input", { issues });
  }
  return result.data;
}
