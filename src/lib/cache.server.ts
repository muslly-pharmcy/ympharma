// Lightweight in-memory TTL cache for server functions. Per-worker only (no Redis).
// Use for short-lived computed values (e.g. recommendations) where stale-by-a-few-minutes
// is acceptable. Do NOT store user-specific secrets.

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds = 300): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  // Soft cap to avoid unbounded growth in a single worker.
  if (store.size > 500) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const v = await loader();
  cacheSet(key, v, ttlSeconds);
  return v;
}
