// INT-P3-006 — Third-party integration health checks.
// Each check MUST be safe to run without side effects and return quickly (<5s).
// Server-only.

export type IntegrationName =
  | "supabase"
  | "lovable_ai"
  | "n8n"
  | "whatsapp"
  | "slack";

export type IntegrationHealth = {
  name: IntegrationName;
  ok: boolean;
  latencyMs: number;
  detail?: string;
};

const TIMEOUT_MS = 5000;

async function timed(name: IntegrationName, fn: () => Promise<{ ok: boolean; detail?: string }>): Promise<IntegrationHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const result = await fn().finally(() => clearTimeout(t));
    return { name, ok: result.ok, latencyMs: Date.now() - start, detail: result.detail };
  } catch (err) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    };
  }
}

async function checkSupabase(): Promise<{ ok: boolean; detail?: string }> {
  const url = process.env.SUPABASE_URL;
  if (!url) return { ok: false, detail: "SUPABASE_URL missing" };
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "" } });
  return { ok: res.ok || res.status === 401, detail: `HTTP ${res.status}` };
}

async function checkLovableAi(): Promise<{ ok: boolean; detail?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, detail: "LOVABLE_API_KEY missing" };
  // Cheap HEAD/GET against the gateway root; failing means DNS/network path is down.
  const res = await fetch("https://ai.gateway.lovable.dev/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  return { ok: res.ok, detail: `HTTP ${res.status}` };
}

async function checkN8n(): Promise<{ ok: boolean; detail?: string }> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return { ok: true, detail: "not configured" };
  const u = new URL(url);
  const res = await fetch(`${u.protocol}//${u.host}`, { method: "GET" });
  return { ok: res.status < 500, detail: `HTTP ${res.status}` };
}

async function checkWhatsapp(): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.WHATSAPP_TOKEN ?? process.env.META_WHATSAPP_TOKEN;
  if (!token) return { ok: true, detail: "not configured" };
  const res = await fetch("https://graph.facebook.com/v20.0/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, detail: `HTTP ${res.status}` };
}

async function checkSlack(): Promise<{ ok: boolean; detail?: string }> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: true, detail: "not configured" };
  // Slack webhooks reject GET with 400 but that proves reachability.
  const res = await fetch(url, { method: "GET" });
  return { ok: res.status < 500, detail: `HTTP ${res.status}` };
}

export async function checkAllIntegrations(): Promise<IntegrationHealth[]> {
  return Promise.all([
    timed("supabase", checkSupabase),
    timed("lovable_ai", checkLovableAi),
    timed("n8n", checkN8n),
    timed("whatsapp", checkWhatsapp),
    timed("slack", checkSlack),
  ]);
}

export function summarizeIntegrations(items: IntegrationHealth[]): {
  ok: boolean;
  degraded: IntegrationName[];
  down: IntegrationName[];
} {
  const down = items.filter((i) => !i.ok).map((i) => i.name);
  const degraded = items.filter((i) => i.ok && i.latencyMs > 2000).map((i) => i.name);
  return { ok: down.length === 0, degraded, down };
}
