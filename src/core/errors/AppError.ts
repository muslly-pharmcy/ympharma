// ============================================================
// AppError — typed error taxonomy
// ============================================================
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface AppErrorInit {
  code: ErrorCode;
  httpStatus: number;
  userMessage: string;
  devDetail?: string;
  meta?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly devDetail?: string;
  readonly meta?: Record<string, unknown>;

  constructor(init: AppErrorInit) {
    super(init.devDetail ?? init.userMessage);
    this.name = "AppError";
    this.code = init.code;
    this.httpStatus = init.httpStatus;
    this.userMessage = init.userMessage;
    this.devDetail = init.devDetail;
    this.meta = init.meta;
    if (init.cause) (this as { cause?: unknown }).cause = init.cause;
  }
}

export class ValidationError extends AppError {
  constructor(userMessage: string, meta?: Record<string, unknown>, devDetail?: string) {
    super({ code: "VALIDATION_ERROR", httpStatus: 400, userMessage, meta, devDetail });
    this.name = "ValidationError";
  }
}
export class AuthError extends AppError {
  constructor(userMessage = "Authentication required", devDetail?: string) {
    super({ code: "UNAUTHENTICATED", httpStatus: 401, userMessage, devDetail });
    this.name = "AuthError";
  }
}
export class ForbiddenError extends AppError {
  constructor(userMessage = "Access denied", devDetail?: string) {
    super({ code: "FORBIDDEN", httpStatus: 403, userMessage, devDetail });
    this.name = "ForbiddenError";
  }
}
export class NotFoundError extends AppError {
  constructor(userMessage = "Not found", devDetail?: string) {
    super({ code: "NOT_FOUND", httpStatus: 404, userMessage, devDetail });
    this.name = "NotFoundError";
  }
}
export class ConflictError extends AppError {
  constructor(userMessage: string, devDetail?: string) {
    super({ code: "CONFLICT", httpStatus: 409, userMessage, devDetail });
    this.name = "ConflictError";
  }
}
export class RateLimitError extends AppError {
  constructor(userMessage = "Too many requests", devDetail?: string) {
    super({ code: "RATE_LIMITED", httpStatus: 429, userMessage, devDetail });
    this.name = "RateLimitError";
  }
}
export class InternalError extends AppError {
  constructor(devDetail?: string, cause?: unknown) {
    super({
      code: "INTERNAL",
      httpStatus: 500,
      userMessage: "Something went wrong. Please try again.",
      devDetail,
      cause,
    });
    this.name = "InternalError";
  }
}
