// Server-side accessor for the (publishable) Sentry DSN.
// Kept in a server fn so the operator can store it as a normal runtime
// secret (SENTRY_DSN) instead of the reserved VITE_ prefix.

import { createServerFn } from "@tanstack/react-start";

export const getSentryConfig = createServerFn({ method: "GET" }).handler(async () => {
  const dsn = process.env.SENTRY_DSN ?? null;
  return {
    dsn,
    environment: process.env.NODE_ENV ?? "production",
  };
});
