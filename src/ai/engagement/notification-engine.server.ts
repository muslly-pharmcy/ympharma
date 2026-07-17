import webpush from "web-push";

type Sub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:admin@musalli.local";
  if (!pub || !priv) throw new Error("VAPID keys missing");
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  deliveryId?: string;
};

export async function sendPush(
  sub: Sub,
  payload: PushPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  configure();
  try {
    const res = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true, status: res.statusCode };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    return {
      ok: false,
      status: e.statusCode,
      error: e.body || e.message || String(err),
    };
  }
}
