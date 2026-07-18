// EFF-P4-004 — Lightweight scheduler helpers.
// Non-authoritative: real scheduling is pg_cron. This module records intent for
// dashboards and prevents duplicate ticks in the same isolate.

type Tick = { at: number; result: "ok" | "skipped" | "error" };
const registry = new Map<string, Tick[]>();
const inflight = new Map<string, Promise<unknown>>();
const HISTORY = 20;

/** Guard against concurrent ticks of the same job in a single isolate. */
export async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T | "skipped"> {
  if (inflight.has(key)) return "skipped";
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  try {
    const value = await p;
    recordTick(key, "ok");
    return value;
  } catch (err) {
    recordTick(key, "error");
    throw err;
  }
}

function recordTick(key: string, result: Tick["result"]) {
  const arr = registry.get(key) ?? [];
  arr.push({ at: Date.now(), result });
  if (arr.length > HISTORY) arr.shift();
  registry.set(key, arr);
}

export function getSchedulerHistory(): Record<string, Tick[]> {
  return Object.fromEntries(registry);
}
