// Anonymous client-side error reporter. Sends to /api/public/log-error so
// even signed-out visitors can be diagnosed (useful for network-blocked
// regions like YemenNet). Throttled and best-effort.

const SEEN: { key: string; at: number }[] = [];
const WINDOW_MS = 15_000;
const MAX_PER_WINDOW = 5;

function allowed(key: string): boolean {
  const now = Date.now();
  for (let i = SEEN.length - 1; i >= 0; i--) {
    if (now - SEEN[i].at > WINDOW_MS) SEEN.splice(i, 1);
  }
  if (SEEN.length >= MAX_PER_WINDOW) return false;
  if (SEEN.some((r) => r.key === key)) return false;
  SEEN.push({ key, at: now });
  return true;
}

function post(body: Record<string, unknown>) {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/public/log-error", blob);
      return;
    }
    void fetch("/api/public/log-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: data,
      keepalive: true,
    });
  } catch {
    /* swallow */
  }
}

let installed = false;
export function installAnonErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const msg = String(event.message ?? event.error?.message ?? "error");
    const key = `e:${msg}:${event.filename}:${event.lineno}`;
    if (!allowed(key)) return;
    post({
      level: "error",
      message: msg,
      stack: event.error?.stack?.slice(0, 3000) ?? null,
      url: window.location.href,
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const msg = typeof reason === "string" ? reason : String(reason?.message ?? reason);
    const key = `r:${msg}`;
    if (!allowed(key)) return;
    post({
      level: "error",
      message: `unhandled_rejection: ${msg}`,
      stack: reason?.stack?.slice(0, 3000) ?? null,
      url: window.location.href,
    });
  });

  // Network failure observer — wraps fetch to catch failed loads
  // (the typical YemenNet symptom: requests time out or DNS fails).
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      const res = await origFetch(...args);
      if (res.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        const key = `5xx:${url}:${res.status}`;
        if (allowed(key)) {
          post({
            level: "warn",
            message: `http_${res.status}`,
            url: window.location.href,
            extra: { request_url: url, status: res.status },
          });
        }
      }
      return res;
    } catch (err) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const msg = err instanceof Error ? err.message : String(err);
      const key = `netfail:${url}:${msg}`;
      if (allowed(key)) {
        post({
          level: "error",
          message: `network_failure: ${msg}`,
          url: window.location.href,
          extra: { request_url: url },
        });
      }
      throw err;
    }
  };
}
