import { getVapidPublicKey } from "@/lib/visitor.functions";
import { subscribePush } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestPushSubscription(visitorToken: string | null): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (typeof window === "undefined") return { ok: false, reason: "server" };
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "sw_failed" };

  const { publicKey } = await getVapidPublicKey();
  if (!publicKey) return { ok: false, reason: "no_vapid_key" };

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "bad_subscription" };
  }

  await subscribePush({
    data: {
      visitorToken,
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
      userAgent: navigator.userAgent,
    },
  });
  return { ok: true };
}
