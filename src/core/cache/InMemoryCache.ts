import type { CacheProvider } from "./CacheProvider";

interface Entry {
  value: unknown;
  expiresAt: number; // epoch ms; Infinity for no TTL
}

export class InMemoryCache implements CacheProvider {
  private store = new Map<string, Entry>();
  constructor(private maxEntries = 1000) {}

  async get<T>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    // LRU touch
    this.store.delete(key);
    this.store.set(key, e);
    return e.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : Infinity;
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const value = await producer();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const defaultCache: CacheProvider = new InMemoryCache();
