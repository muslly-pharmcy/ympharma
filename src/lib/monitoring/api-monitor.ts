// QOS-P3-002 — In-process API latency monitor.
// Rolling window over the last N samples; reports p50/p95/p99 per route.
// Server-only (state lives in the Worker isolate).

type Sample = { at: number; ms: number; ok: boolean };
const WINDOW = 200;
const buckets = new Map<string, Sample[]>();

export function recordApiSample(route: string, ms: number, ok: boolean) {
  const arr = buckets.get(route) ?? [];
  arr.push({ at: Date.now(), ms, ok });
  if (arr.length > WINDOW) arr.shift();
  buckets.set(route, arr);
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export type RouteStats = {
  route: string;
  count: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
};

export function getApiStats(): RouteStats[] {
  const out: RouteStats[] = [];
  for (const [route, arr] of buckets) {
    if (arr.length === 0) continue;
    const durations = arr.map((s) => s.ms).sort((a, b) => a - b);
    const errors = arr.filter((s) => !s.ok).length;
    out.push({
      route,
      count: arr.length,
      errorRate: errors / arr.length,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: durations[durations.length - 1] ?? 0,
    });
  }
  return out.sort((a, b) => b.p95 - a.p95);
}

export function resetApiStats() {
  buckets.clear();
}
