// In-memory LRU cache for remote images (e.g. prescription signed URLs).
// Avoids re-downloading the same image when the user scrolls through a
// virtualized list or re-opens a prescription card.

const MAX_ENTRIES = 120;
const cache = new Map<string, string>(); // url -> blob object URL
const inflight = new Map<string, Promise<string>>();

function touch(url: string, objectUrl: string) {
  if (cache.has(url)) cache.delete(url);
  cache.set(url, objectUrl);
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const old = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (old) URL.revokeObjectURL(old);
  }
}

export function getCachedImage(url: string): string | undefined {
  const hit = cache.get(url);
  if (hit) {
    // refresh LRU position
    cache.delete(url);
    cache.set(url, hit);
  }
  return hit;
}

export async function fetchImageCached(url: string): Promise<string> {
  const hit = getCachedImage(url);
  if (hit) return hit;
  const pending = inflight.get(url);
  if (pending) return pending;
  const p = (async () => {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    touch(url, objectUrl);
    return objectUrl;
  })();
  inflight.set(url, p);
  try { return await p; } finally { inflight.delete(url); }
}

export function prefetchImageCached(url: string) {
  if (typeof window === "undefined") return;
  if (cache.has(url) || inflight.has(url)) return;
  fetchImageCached(url).catch(() => { /* ignore prefetch errors */ });
}
