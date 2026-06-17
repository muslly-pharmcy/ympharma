// In-memory LRU cache for remote images (e.g. prescription signed URLs)
// with TTL and targeted invalidation. Avoids re-downloading the same image
// when scrolling a virtualized list or re-opening a card, while still
// honouring freshness when an entity is edited.

const MAX_ENTRIES = 120;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

type Entry = { objectUrl: string; expiresAt: number };

const cache = new Map<string, Entry>(); // url -> entry
const inflight = new Map<string, Promise<string>>();

function evictOldest() {
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const old = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (old) URL.revokeObjectURL(old.objectUrl);
  }
}

function setEntry(url: string, objectUrl: string, ttlMs: number) {
  const prev = cache.get(url);
  if (prev) URL.revokeObjectURL(prev.objectUrl);
  cache.delete(url);
  cache.set(url, { objectUrl, expiresAt: Date.now() + ttlMs });
  evictOldest();
}

export function getCachedImage(url: string): string | undefined {
  const hit = cache.get(url);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(url);
    URL.revokeObjectURL(hit.objectUrl);
    return undefined;
  }
  // refresh LRU position
  cache.delete(url);
  cache.set(url, hit);
  return hit.objectUrl;
}

export async function fetchImageCached(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<string> {
  const hit = getCachedImage(url);
  if (hit) return hit;
  const pending = inflight.get(url);
  if (pending) return pending;
  const p = (async () => {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    setEntry(url, objectUrl, ttlMs);
    return objectUrl;
  })();
  inflight.set(url, p);
  try { return await p; } finally { inflight.delete(url); }
}

export function prefetchImageCached(url: string) {
  if (typeof window === "undefined") return;
  if (getCachedImage(url) || inflight.has(url)) return;
  fetchImageCached(url).catch(() => { /* ignore prefetch errors */ });
}

/** Drop a single cached URL (e.g. signed link rotated). */
export function invalidateImage(url: string) {
  const hit = cache.get(url);
  if (hit) {
    URL.revokeObjectURL(hit.objectUrl);
    cache.delete(url);
  }
  inflight.delete(url);
}

/** Drop any cached URL containing the given substring (e.g. an Rx folder/id). */
export function invalidateImagesMatching(substring: string) {
  for (const url of Array.from(cache.keys())) {
    if (url.includes(substring)) invalidateImage(url);
  }
}

/** Drop EVERY cached image (use sparingly — e.g. on logout). */
export function clearImageCache() {
  for (const { objectUrl } of cache.values()) URL.revokeObjectURL(objectUrl);
  cache.clear();
  inflight.clear();
}
