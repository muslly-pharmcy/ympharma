// Lightweight Web Vitals + SW telemetry — no external deps.
// Tracks FCP, LCP, navigation fetch time, and SW fallback count.
// Persists to localStorage so /network-test can read across reloads.

export type PerfSnapshot = {
  fcp?: number;        // ms
  lcp?: number;        // ms
  navFetch?: number;   // ms — responseEnd - fetchStart
  ttfb?: number;       // ms
  domReady?: number;   // ms
  swFallbackCount: number;
  lastSwFallbackAt?: number;
  updatedAt: number;
};

const LS_KEY = "perf_metrics_v1";
const SW_FALLBACK_KEY = "perf_sw_fallback_v1";

declare global {
  interface Window {
    __PERF__?: PerfSnapshot;
  }
}

function read(): PerfSnapshot {
  if (typeof window === "undefined") return { swFallbackCount: 0, updatedAt: 0 };
  if (window.__PERF__) return window.__PERF__;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PerfSnapshot;
      window.__PERF__ = parsed;
      return parsed;
    }
  } catch { /* ignore */ }
  const fresh: PerfSnapshot = {
    swFallbackCount: Number(localStorage.getItem(SW_FALLBACK_KEY) || 0),
    updatedAt: Date.now(),
  };
  window.__PERF__ = fresh;
  return fresh;
}

function write(patch: Partial<PerfSnapshot>) {
  if (typeof window === "undefined") return;
  const cur = read();
  const next: PerfSnapshot = { ...cur, ...patch, updatedAt: Date.now() };
  window.__PERF__ = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("perf:update", { detail: next })); } catch { /* ignore */ }
}

export function readPerf(): PerfSnapshot {
  return read();
}

export function initPerfMetrics() {
  if (typeof window === "undefined") return;
  // Navigation timing
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      write({
        navFetch: Math.round(nav.responseEnd - nav.fetchStart),
        ttfb: Math.round(nav.responseStart - nav.fetchStart),
        domReady: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
      });
    }
  } catch { /* ignore */ }

  // FCP via PerformanceObserver
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          write({ fcp: Math.round(entry.startTime) });
        }
      }
    });
    po.observe({ type: "paint", buffered: true });
  } catch { /* ignore */ }

  // LCP
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) write({ lcp: Math.round(last.startTime) });
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* ignore */ }

  // SW fallback diagnostics
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (ev) => {
      if (ev.data?.type === "SW_DIAG" && ev.data?.msg === "nav-fallback-offline") {
        const next = (read().swFallbackCount || 0) + 1;
        try { localStorage.setItem(SW_FALLBACK_KEY, String(next)); } catch { /* ignore */ }
        write({ swFallbackCount: next, lastSwFallbackAt: Date.now() });
      }
    });
  }
}
