// Exponential-backoff retry utility for transient failures.
// Use for: external HTTP calls, webhook dispatch, flaky third-party APIs.
// Do NOT use for: user input validation errors, auth failures, 4xx responses.

export type RetryOptions = {
  retries?: number;          // total attempts = retries + 1 (default 3 → 4 attempts)
  baseDelayMs?: number;      // initial delay (default 300ms)
  maxDelayMs?: number;       // cap per-attempt delay (default 8000ms)
  factor?: number;           // exponential multiplier (default 2)
  jitter?: boolean;          // randomize ±25% (default true)
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
};

const TRANSIENT_PATTERNS = [
  /no providers available/i,
  /unavailable/i,
  /timeout/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /fetch failed/i,
  /\b50[234]\b/,
  /rate.?limit/i,
];

export function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return TRANSIENT_PATTERNS.some((re) => re.test(msg));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 8000,
    factor = 2,
    jitter = true,
    shouldRetry = (e) => isTransientError(e),
    onRetry,
  } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(err, attempt)) throw err;
      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(factor, attempt - 1));
      const delay = jitter ? exp * (0.75 + Math.random() * 0.5) : exp;
      onRetry?.(err, attempt, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
