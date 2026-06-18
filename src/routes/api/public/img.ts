import { createFileRoute } from "@tanstack/react-router";

// Whitelist of upstream hosts we are willing to proxy. Keeps the endpoint
// from being abused as an open proxy.
const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "source.unsplash.com",
  "img.youtube.com",
  "i.imgur.com",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        if (!target) {
          return new Response("missing u", { status: 400, headers: CORS });
        }
        let upstream: URL;
        try {
          upstream = new URL(target);
        } catch {
          return new Response("invalid url", { status: 400, headers: CORS });
        }
        if (upstream.protocol !== "https:" || !ALLOWED_HOSTS.has(upstream.hostname)) {
          return new Response("host not allowed", { status: 403, headers: CORS });
        }
        try {
          const upstreamRes = await fetch(upstream.toString(), {
            headers: { "User-Agent": "musllyImgProxy/1.0", "Accept": "image/*,*/*;q=0.8" },
          });
          if (!upstreamRes.ok || !upstreamRes.body) {
            return new Response("upstream error", { status: 502, headers: CORS });
          }
          const ct = upstreamRes.headers.get("content-type") ?? "image/jpeg";
          return new Response(upstreamRes.body, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable",
              ...CORS,
            },
          });
        } catch {
          return new Response("fetch failed", { status: 502, headers: CORS });
        }
      },
    },
  },
});
