// Optional Sentry integration (M14).
// No-op when VITE_SENTRY_DSN is not configured — keeps the dependency cheap
// and unobtrusive until the operator wires their own DSN.

import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized || typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      environment: (import.meta.env.MODE as string) ?? "production",
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
    });
    initialized = true;
  } catch {
    /* never break the app if Sentry init fails */
  }
}

export function captureClientError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    Sentry.captureException(error, { extra: context });
  } catch {
    /* ignore */
  }
}

export function setCorrelationId(id: string | null) {
  if (!initialized) return;
  try {
    Sentry.setTag("correlation_id", id ?? "");
  } catch {
    /* ignore */
  }
}
