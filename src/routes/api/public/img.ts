import { createFileRoute } from "@tanstack/react-router";

// Fallback defaults if settings row is unavailable (cold start, DB hiccup).
const DEFAULT_HOSTS = [
  "images.unsplash.com",
  "plus.unsplash.com",
  "source.unsplash.com",
  "img.youtube.com",
  "i.imgur.com",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// In-memory cache of allow-list to avoid hitting the DB on every image.
let cachedHosts: Set<string> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadAllowedHosts(): Promise<Set<string>> {
  if (cachedHosts && Date.now() < cacheExpiresAt) return cachedHosts;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("img_proxy_settings")
      .select("allowed_hosts")
      .eq("id", 1)
      .maybeSingle();
    const hosts = (data?.allowed_hosts as string[] | undefined) ?? DEFAULT_HOSTS;
    cachedHosts = new Set(hosts);
  } catch {
    cachedHosts = new Set(DEFAULT_HOSTS);
  }
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedHosts;
}

async function logAttempt(entry: {
  host: string | null;
  url: string;
  status: number;
  ok: boolean;
  error: string | null;
  duration_ms: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("img_proxy_logs").insert(entry);
  } catch {
    // never let logging failures break image delivery
  }
}

export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const started = Date.now();
        const url = new URL(request.url);
        const target = url.searchParams.get("u") ?? "";

        let upstream: URL | null = null;
        try {
          upstream = new URL(target);
        } catch {
          // invalid URL — log and return
        }

        if (!target || !upstream) {
          await logAttempt({
            host: null,
            url: target || "(empty)",
            status: 400,
            ok: false,
            error: "invalid_or_missing_url",
            duration_ms: Date.now() - started,
          });
          return new Response("invalid url", { status: 400, headers: CORS });
        }

        const allowed = await loadAllowedHosts();
        if (upstream.protocol !== "https:" || !allowed.has(upstream.hostname)) {
          await logAttempt({
            host: upstream.hostname,
            url: target,
            status: 403,
            ok: false,
            error: upstream.protocol !== "https:" ? "non_https" : "host_not_in_allowlist",
            duration_ms: Date.now() - started,
          });
          return new Response("host not allowed", { status: 403, headers: CORS });
        }

        try {
          const upstreamRes = await fetch(upstream.toString(), {
            headers: { "User-Agent": "musllyImgProxy/1.0", "Accept": "image/*,*/*;q=0.8" },
          });
          if (!upstreamRes.ok || !upstreamRes.body) {
            await logAttempt({
              host: upstream.hostname,
              url: target,
              status: upstreamRes.status,
              ok: false,
              error: `upstream_${upstreamRes.status}`,
              duration_ms: Date.now() - started,
            });
            return new Response("upstream error", { status: 502, headers: CORS });
          }
          const ct = upstreamRes.headers.get("content-type") ?? "image/jpeg";
          // fire-and-forget success log
          void logAttempt({
            host: upstream.hostname,
            url: target,
            status: upstreamRes.status,
            ok: true,
            error: null,
            duration_ms: Date.now() - started,
          });
          return new Response(upstreamRes.body, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable",
              ...CORS,
            },
          });
        } catch (err) {
          await logAttempt({
            host: upstream.hostname,
            url: target,
            status: 502,
            ok: false,
            error: err instanceof Error ? err.message.slice(0, 500) : "fetch_failed",
            duration_ms: Date.now() - started,
          });
          return new Response("fetch failed", { status: 502, headers: CORS });
        }
      },
    },
  },
});
