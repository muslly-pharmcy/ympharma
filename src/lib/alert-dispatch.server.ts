// Multi-channel alert dispatcher: Slack, Twilio SMS, WhatsApp Cloud API.
// Each dispatcher returns a count of successful sends and never throws —
// failures are logged so a single broken channel cannot drop the alert.
// Outbound HTTP wrapped with withRetry() for transient infra failures.

import { withRetry, isTransientError } from "./retry";

async function postWithRetry(label: string, doFetch: () => Promise<Response>): Promise<boolean> {
  try {
    const r = await withRetry(async () => {
      const res = await doFetch();
      // Treat 5xx + 429 as transient → throw so retry kicks in
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`${label} HTTP ${res.status}`);
      }
      return res;
    }, {
      retries: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000,
      shouldRetry: (e) => isTransientError(e),
      onRetry: (e, attempt, delay) =>
        console.warn(`[alert-dispatch] ${label} retry ${attempt} in ${Math.round(delay)}ms:`, e instanceof Error ? e.message : e),
    });
    if (!r.ok) console.error(`[alert-dispatch] ${label} HTTP`, r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error(`[alert-dispatch] ${label} failed after retries:`, e);
    return false;
  }
}


const SEVERITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function severityAtLeast(actual: string, min: string): boolean {
  return (SEVERITY_RANK[actual] ?? 0) >= (SEVERITY_RANK[min] ?? 0);
}

export async function sendSlack(opts: {
  webhookUrl?: string;
  agent: string;
  severity: string;
  message: string;
  reportUrl: string;
  payload?: Record<string, unknown> | null;
}): Promise<boolean> {
  const url = opts.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  const color = opts.severity === "critical" ? "#b91c1c" : opts.severity === "high" ? "#ea580c" : "#ca8a04";
  const body = {
    text: `[${opts.severity.toUpperCase()}] ${opts.agent} — ${opts.message}`,
    attachments: [
      {
        color,
        fields: [
          { title: "Agent", value: opts.agent, short: true },
          { title: "Severity", value: opts.severity, short: true },
          { title: "Message", value: opts.message, short: false },
        ],
        actions: [{ type: "button", text: "View Report", url: opts.reportUrl }],
        footer: opts.payload ? JSON.stringify(opts.payload).slice(0, 400) : undefined,
      },
    ],
  };
  return postWithRetry("slack", () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function sendSms(opts: {
  to: string;
  message: string;
}): Promise<boolean> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!lovableKey || !twilioKey || !from) return false;
  return postWithRetry("twilio-sms", () =>
    fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: opts.to, From: from, Body: opts.message.slice(0, 1500) }),
    }),
  );
}

export async function sendWhatsApp(opts: {
  to: string; // E.164 without leading +
  message: string;
}): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return false;
  const cleanTo = opts.to.replace(/^\+/, "");
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { body: opts.message.slice(0, 1500), preview_url: false },
      }),
    });
    if (!r.ok) console.error("[alert-dispatch] whatsapp HTTP", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("[alert-dispatch] whatsapp failed:", e);
    return false;
  }
}
