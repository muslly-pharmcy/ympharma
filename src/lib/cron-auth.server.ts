import { timingSafeEqual } from "crypto";

/**
 * Validate the `x-cron-secret` header against the server-only CRON_SECRET env.
 * Returns null on success; returns a Response (401/503) to short-circuit the handler on failure.
 *
 * Use for cron-driven hooks where the caller is pg_cron / an internal scheduler.
 * The secret is never shipped to the browser bundle (no VITE_ prefix).
 */
export function verifyCronSecret(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("cron_secret") ??
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
