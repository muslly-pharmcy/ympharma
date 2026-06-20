// Optional Sentry integration (M14).
// No-op when SENTRY_DSN is not configured on the server — keeps the
// dependency cheap and unobtrusive until the operator wires their DSN.
//
// The DSN is a publishable identifier (safe in client bundles) but we keep
// it as a normal runtime secret (SENTRY_DSN) and fetch it via the server
// fn `getSentryConfig`. This avoids the reserved `VITE_` prefix.

import * as Sentry from "@sentry/react";
import { getSentryConfig } from "./sentry-config.functions";

let initialized = false;
let initStarted = false;

export function initSentry() {
  if (initStarted || typeof window === "undefined") return;
  initStarted = true;
  // Fire-and-forget — never block the app boot on Sentry.
  void (async () => {
    try {
      const cfg = await getSentryConfig();
      if (!cfg?.dsn) return;
      Sentry.init({
        dsn: cfg.dsn,
        environment: cfg.environment ?? "production",
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: false,
      });
      initialized = true;
    } catch {
      /* never break the app if Sentry init fails */
    }
  })();
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
