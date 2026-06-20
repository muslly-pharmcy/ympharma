import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Public error-log ingestion endpoint. Used by the in-browser error reporter
// to log client-side failures even for anonymous visitors (helps diagnose
// YemenNet-style network blocks). Rate limit is enforced at the table level
// via a simple insert-only RLS policy; we additionally cap message length here.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function clip(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v : String(v);
  return s.length > max ? s.slice(0, max) : s;
}

// Per-IP token bucket: max 5 requests per rolling 60s window.
// In-memory (per-isolate) — acceptable for client error noise gating.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // Opportunistic cleanup to bound memory.
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => t > cutoff);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/public/log-error")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const ip = clientIp(request);
        if (rateLimited(ip)) {
          return Response.json(
            { ok: false, error: "rate_limited" },
            { status: 429, headers: { ...CORS, "Retry-After": "60" } },
          );
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 400, headers: CORS });
        }

        const message = clip(body.message, 2000);
        if (!message) {
          return Response.json({ ok: false, error: "missing_message" }, { status: 400, headers: CORS });
        }

        const country =
          request.headers.get("cf-ipcountry") ||
          request.headers.get("x-vercel-ip-country") ||
          null;

        try {
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
          );
          await admin.from("error_logs").insert({
            level: (body.level as string) === "warn" ? "warn" : "error",
            source: "client",
            message,
            stack: clip(body.stack, 4000),
            url: clip(body.url, 1000),
            user_agent: clip(request.headers.get("user-agent"), 500),
            country,
            extra: (body.extra as object) ?? {},
          });
        } catch {
          /* swallow — never break the client */
        }

        return Response.json({ ok: true }, { headers: CORS });
      },
    },
  },
});
