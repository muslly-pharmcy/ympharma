import { useEffect, useState } from "react";
import { trackEvent } from "../analytics/track";

const DISMISS_KEY = "vx.notif.dismissed.v1";
const ENGAGE_KEY = "vx.notif.engage.v1";
const THRESHOLD = 2;
const DELAY_MS = 20_000;

export function markEngagement() {
  if (typeof window === "undefined") return;
  try {
    const cur = Number(sessionStorage.getItem(ENGAGE_KEY) ?? "0");
    sessionStorage.setItem(ENGAGE_KEY, String(cur + 1));
  } catch { /* ignore */ }
}

export function useNotificationNudge() {
  const [show, setShow] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    setSupported(true);
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (Notification.permission !== "default") return;

    const check = () => {
      const engage = Number(sessionStorage.getItem(ENGAGE_KEY) ?? "0");
      if (engage >= THRESHOLD) { setShow(true); trackEvent("notification_nudge_shown"); }
    };
    const t = window.setTimeout(check, DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
    trackEvent("notification_nudge_dismissed");
  };

  const requestPermission = async () => {
    if (!supported) return;
    try {
      const res = await Notification.requestPermission();
      trackEvent(res === "granted" ? "notification_permission_granted" : "notification_permission_denied");
    } catch { /* ignore */ }
    dismiss();
  };

  return { show, dismiss, requestPermission, supported };
}
