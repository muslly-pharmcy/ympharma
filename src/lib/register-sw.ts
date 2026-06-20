// Service-worker registration with update prompt + diagnostic log.
//
// Critical for Yemen-side users (YemenNet / TeleYemen): once the SW installs,
// the app keeps loading from cache even when the network fails. This module
// also records every step into `window.__SW_LOG__` and `localStorage.sw_log`
// so the internal /network-test page can inspect registration health.

export type SwLogEntry = {
  ts: number;
  level: "info" | "warn" | "error";
  msg: string;
  meta?: Record<string, unknown>;
};

const LS_KEY = "sw_log";
const MAX_ENTRIES = 50;

declare global {
  interface Window {
    __SW_LOG__?: SwLogEntry[];
    __SW_VERSION__?: string;
    __SW_UPDATE_READY__?: boolean;
    __SW_APPLY_UPDATE__?: () => void;
  }
}

function pushLog(level: SwLogEntry["level"], msg: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const entry: SwLogEntry = { ts: Date.now(), level, msg, meta };
  const arr = (window.__SW_LOG__ ||= []);
  arr.push(entry);
  if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    /* storage full / blocked — ignore */
  }
  const tag = "[sw]";
  if (level === "error") console.error(tag, msg, meta ?? "");
  else if (level === "warn") console.warn(tag, msg, meta ?? "");
  else console.info(tag, msg, meta ?? "");
  try {
    window.dispatchEvent(new CustomEvent("sw:log", { detail: entry }));
  } catch {
    /* ignore */
  }
}

export function readSwLog(): SwLogEntry[] {
  if (typeof window === "undefined") return [];
  if (window.__SW_LOG__?.length) return window.__SW_LOG__;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SwLogEntry[];
      window.__SW_LOG__ = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function isPreviewHost(host: string): boolean {
  // Lovable preview iframes — SW would be sandboxed and confuse the editor.
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev")
  );
}

function notifyUpdateReady(reg: ServiceWorkerRegistration) {
  if (typeof window === "undefined") return;
  window.__SW_UPDATE_READY__ = true;
  window.__SW_APPLY_UPDATE__ = () => {
    const waiting = reg.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    // Reload as soon as the new SW takes control.
    const onChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    waiting.postMessage({ type: "SKIP_WAITING" });
  };
  pushLog("info", "update_ready");
  try {
    window.dispatchEvent(new CustomEvent("sw:updateready"));
  } catch {
    /* ignore */
  }
}

function trackInstallingWorker(reg: ServiceWorkerRegistration, worker: ServiceWorker | null) {
  if (!worker) return;
  worker.addEventListener("statechange", () => {
    pushLog("info", `installing_state:${worker.state}`);
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      // A previous SW already controls the page → new one is waiting.
      notifyUpdateReady(reg);
    }
  });
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) {
    pushLog("warn", "unsupported_browser");
    return;
  }
  const { protocol, hostname } = window.location;
  if (protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1") {
    pushLog("warn", "skip_insecure_origin", { protocol, hostname });
    return;
  }
  if (isPreviewHost(hostname)) {
    pushLog("info", "skip_preview_host", { hostname });
    return;
  }
  if (window.self !== window.top) {
    pushLog("info", "skip_iframe");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      pushLog("info", "registered", { scope: reg.scope });

      // Capture version from the active worker for diagnostics.
      const queryVersion = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const channel = new MessageChannel();
        channel.port1.onmessage = (ev) => {
          if (ev.data?.version) {
            window.__SW_VERSION__ = ev.data.version;
            pushLog("info", "version", { version: ev.data.version });
          }
        };
        try {
          worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
        } catch {
          /* ignore */
        }
      };
      queryVersion(reg.active);

      if (reg.waiting && navigator.serviceWorker.controller) {
        notifyUpdateReady(reg);
      }
      trackInstallingWorker(reg, reg.installing);
      reg.addEventListener("updatefound", () => {
        pushLog("info", "updatefound");
        trackInstallingWorker(reg, reg.installing);
      });

      // Re-check for updates every 30 minutes while the tab is visible.
      setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        reg.update().catch((err) => pushLog("warn", "update_check_failed", { err: String(err) }));
      }, 30 * 60 * 1000);
    } catch (err) {
      pushLog("error", "registration_failed", { err: String(err) });
    }
  });

  navigator.serviceWorker.addEventListener("message", (ev) => {
    if (ev.data?.type === "SW_LOG") pushLog("info", "sw_message", ev.data);
  });
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  pushLog("warn", "unregistered_manual", { count: regs.length });
  return regs.length > 0;
}

export async function forceUpdateCheck(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    pushLog("warn", "force_update_no_registration");
    return;
  }
  await reg.update();
  pushLog("info", "force_update_triggered");
}
