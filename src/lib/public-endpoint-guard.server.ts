// Lightweight in-process abuse guards for public POST endpoints.
// Not cluster-wide (per-worker instance), but adds meaningful friction to
// naive abuse without requiring new infrastructure. Preserves existing
// business logic — used as an early return before parsing/DB writes.

import { createHash } from "crypto";

/** Hash an IP (or any string) to a short hex fingerprint. */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Extract the caller IP from common proxy headers. */
export function extractIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/**
 * Read the request body as text with a hard byte-length cap.
 * Returns `{ oversize: true }` if the body exceeds `maxBytes`.
 */
export async function readTextWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ oversize: true } | { oversize: false; text: string }> {
  // Cheap early check via Content-Length when present.
  const cl = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(cl) && cl > maxBytes) return { oversize: true };

  const body = request.body;
  if (!body) return { oversize: false, text: "" };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* noop */
        }
        return { oversize: true };
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { oversize: false, text: new TextDecoder().decode(merged) };
}

// --- Cooldown ---------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

/**
 * Fixed-window cooldown per key (usually an IP hash).
 * Returns `{ allowed: false, retryAfter }` when the caller exceeds `limit`
 * within `windowMs`. In-memory only; per-worker instance.
 */
export function checkCooldown(
  key: string | null,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfter: number } {
  if (!key) return { allowed: true }; // no IP → don't block; upstream will still validate
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    // occasional GC when the map grows unbounded
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true };
}
