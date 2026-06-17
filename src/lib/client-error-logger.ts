// Client-side global error logger.
// Captures window errors + unhandled promise rejections and forwards them
// to the server `logActivity` RPC so they appear in admin → السجلات.
// Best-effort: silent failure, throttled, and only when a user is signed in.

import { logActivity } from "./activity.functions";
import { supabase } from "@/integrations/supabase/client";

const RECENT: { key: string; at: number }[] = [];
const WINDOW_MS = 10_000;

function shouldSend(key: string): boolean {
  const now = Date.now();
  // prune
  for (let i = RECENT.length - 1; i >= 0; i--) {
    if (now - RECENT[i].at > WINDOW_MS) RECENT.splice(i, 1);
  }
  if (RECENT.some((r) => r.key === key)) return false;
  RECENT.push({ key, at: now });
  return true;
}

async function send(action: string, details: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // server fn requires auth
    await logActivity({ data: { action, entityType: "client", details } });
  } catch {
    /* swallow */
  }
}

let installed = false;
export function installClientErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const msg = String(event.message ?? event.error?.message ?? "error");
    const key = `err:${msg}:${event.filename}:${event.lineno}`;
    if (!shouldSend(key)) return;
    void send("client.error", {
      message: msg,
      stack: event.error?.stack?.slice(0, 2000) ?? null,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href,
      ua: navigator.userAgent,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const msg = typeof reason === "string" ? reason : String(reason?.message ?? reason);
    const key = `rej:${msg}`;
    if (!shouldSend(key)) return;
    void send("client.unhandled_rejection", {
      message: msg,
      stack: reason?.stack?.slice(0, 2000) ?? null,
      url: window.location.href,
      ua: navigator.userAgent,
    });
  });
}
