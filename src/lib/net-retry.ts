// Shared retry helper with exponential backoff + jitter — tuned for unreliable
// mobile networks. Pause attempts while offline so we don't burn the budget.

export interface RetryOptions {
  max?: number;            // total attempts
  baseMs?: number;         // first backoff
  capMs?: number;          // max backoff
  label?: string;          // for logging
  signal?: AbortSignal;    // cancel
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); }, { once: true });
  });

async function waitForOnline(signal?: AbortSignal): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return;
  await new Promise<void>((resolve, reject) => {
    const onUp = () => { window.removeEventListener("online", onUp); resolve(); };
    window.addEventListener("online", onUp);
    signal?.addEventListener("abort", () => {
      window.removeEventListener("online", onUp);
      reject(new Error("aborted"));
    }, { once: true });
  });
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { max = 5, baseMs = 600, capMs = 8000, label = "op", signal, shouldRetry } = opts;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    if (signal?.aborted) throw new Error("aborted");
    try {
      await waitForOnline(signal);
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      if (shouldRetry && !shouldRetry(e, attempt)) throw e;
      if (attempt >= max) break;
      const delay = Math.min(capMs, baseMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      // eslint-disable-next-line no-console
      console.warn(`[${label}] attempt ${attempt}/${max} failed; retry in ${delay}ms`, e);
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}
