// REL-P3-001 — BaseWorker: shared retry/backoff loop for background workers.
// Server-only helper (no browser imports). Import as `import { runWithRetry } from "@/lib/workers/base-worker"`.
import {
  DEFAULT_RETRY,
  computeBackoff,
  isFatalError,
  type RetryPolicy,
} from "./retry-config";

export type WorkerRunResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; error: Error; attempts: number };

export type WorkerHooks = {
  onAttempt?: (attempt: number) => void;
  onRetry?: (attempt: number, delayMs: number, err: Error) => void;
};

export async function runWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
  hooks: WorkerHooks = {},
): Promise<WorkerRunResult<T>> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    hooks.onAttempt?.(attempt);
    try {
      const value = await fn(attempt);
      return { ok: true, value, attempts: attempt };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (isFatalError(lastErr, policy) || attempt === policy.maxAttempts) break;
      const delay = computeBackoff(attempt, policy);
      hooks.onRetry?.(attempt, delay, lastErr);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return { ok: false, error: lastErr ?? new Error("unknown"), attempts: policy.maxAttempts };
}
