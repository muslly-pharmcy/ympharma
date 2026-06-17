// Persistent localStorage cache for Gemini-generated vitamin info.
// Refreshes only when TTL expires or the cache key changes (name+brand).

const PREFIX = "vinfo:v2:";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type Entry<T> = { at: number; data: T };

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string): T | null {
  const s = safeStorage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.at > TTL_MS) {
      s.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data } satisfies Entry<T>));
  } catch {
    /* quota — ignore */
  }
}

export function cacheKey(name: string, brand?: string): string {
  return `${(brand ?? "").trim()}|${name.trim()}`.toLowerCase();
}
