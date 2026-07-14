// Anonymous visitor analytics. No PII, no cookies, session-scoped id only.
// Buffers events and flushes with sendBeacon on visibility change.

type EventName =
  | "page_view"
  | "search_submitted"
  | "search_category_changed"
  | "cta_clicked"
  | "notification_nudge_shown"
  | "notification_nudge_dismissed"
  | "notification_permission_granted"
  | "notification_permission_denied";

type Payload = { name: EventName; ts: number; sid: string; path: string; props?: Record<string, string | number | boolean | null> };

const BUFFER_KEY = "vx.buf.v1";
const SID_KEY = "vx.sid.v1";
const ENDPOINT = "/api/public/analytics/ingest";
const MAX_BUFFER = 20;

function isBrowser() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function getSessionId(): string {
  if (!isBrowser()) return "ssr";
  let sid = sessionStorage.getItem(SID_KEY);
  if (!sid) {
    sid = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now().toString(36);
    sessionStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

function readBuffer(): Payload[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(sessionStorage.getItem(BUFFER_KEY) ?? "[]"); }
  catch { return []; }
}

function writeBuffer(events: Payload[]) {
  if (!isBrowser()) return;
  try { sessionStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFER))); }
  catch { /* ignore quota */ }
}

export function trackEvent(name: EventName, props?: Payload["props"]) {
  if (!isBrowser()) return;
  const evt: Payload = {
    name,
    ts: Date.now(),
    sid: getSessionId(),
    path: window.location.pathname + window.location.search,
    props,
  };
  const buf = readBuffer();
  buf.push(evt);
  writeBuffer(buf);
  if (buf.length >= MAX_BUFFER) flush();
}

export function flush() {
  if (!isBrowser()) return;
  const buf = readBuffer();
  if (buf.length === 0) return;
  const body = JSON.stringify({ events: buf });
  const ok = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }));
  if (ok) {
    writeBuffer([]);
  } else {
    // fallback: best-effort fetch
    fetch(ENDPOINT, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true })
      .then(() => writeBuffer([]))
      .catch(() => { /* keep buffer for next attempt */ });
  }
}

export function initVisitorAnalytics() {
  if (!isBrowser()) return;
  if ((window as unknown as { __vx_init?: boolean }).__vx_init) return;
  (window as unknown as { __vx_init?: boolean }).__vx_init = true;
  trackEvent("page_view");
  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}
