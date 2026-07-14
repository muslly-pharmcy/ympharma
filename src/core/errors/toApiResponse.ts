// ============================================================
// toApiResponse — security-safe serializer for AppError
// ============================================================
import { AppError, InternalError } from "./AppError";

const IS_PROD =
  (typeof process !== "undefined" && process.env?.NODE_ENV === "production") ||
  false;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
    devDetail?: string;
  };
}

export function toApiErrorBody(err: unknown): {
  status: number;
  body: ApiErrorBody;
} {
  const appErr =
    err instanceof AppError
      ? err
      : new InternalError(err instanceof Error ? err.message : String(err), err);
  const body: ApiErrorBody = {
    error: {
      code: appErr.code,
      message: appErr.userMessage,
      ...(appErr.meta ? { meta: appErr.meta } : {}),
      ...(IS_PROD ? {} : appErr.devDetail ? { devDetail: appErr.devDetail } : {}),
    },
  };
  return { status: appErr.httpStatus, body };
}

export function toApiResponse(err: unknown): Response {
  const { status, body } = toApiErrorBody(err);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
