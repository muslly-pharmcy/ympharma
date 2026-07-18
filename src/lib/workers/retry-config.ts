// REL-P3-001 — Canonical retry configuration shared by all background workers.
// Values chosen to match existing DLQ patterns (see src/core/dlq/).

export type RetryPolicy = {
  maxAttempts: number;
  baseMs: number;
  capMs: number;
  jitter: boolean;
  /** Errors that should NOT be retried (fail fast). */
  fatalCodes: readonly string[];
};

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 5,
  baseMs: 500,
  capMs: 30_000,
  jitter: true,
  fatalCodes: ["UNAUTHORIZED", "FORBIDDEN", "VALIDATION", "NOT_FOUND"],
};

export const AGGRESSIVE_RETRY: RetryPolicy = {
  ...DEFAULT_RETRY,
  maxAttempts: 8,
  capMs: 60_000,
};

export const CONSERVATIVE_RETRY: RetryPolicy = {
  ...DEFAULT_RETRY,
  maxAttempts: 3,
  capMs: 10_000,
};

/** Compute backoff delay in ms for a given attempt (1-based). */
export function computeBackoff(attempt: number, policy: RetryPolicy = DEFAULT_RETRY): number {
  const raw = Math.min(policy.capMs, policy.baseMs * 2 ** Math.max(0, attempt - 1));
  if (!policy.jitter) return raw;
  // Full jitter (AWS pattern) — decorrelates herds.
  return Math.floor(Math.random() * raw);
}

export function isFatalError(err: unknown, policy: RetryPolicy = DEFAULT_RETRY): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code !== "string") return false;
  return policy.fatalCodes.includes(code);
}
