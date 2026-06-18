// Service worker for صيدلية المصلي — offline-first shell for flaky Yemen ISPs
// (YemenNet / TeleYemen often drop TLS mid-handshake or stall page loads).
// Strategy:
//   - Pre-cache the offline fallback page and key icons on install.
//   - Navigation requests: network-first with a 6s timeout, fall back to the
//     cached navigation response, then to /offline.html.
//   - Same-origin static assets (JS/CSS/fonts/images): stale-while-revalidate.
//   - The image proxy (/api/public/img): cache-first, long TTL.

const VERSION = "v3";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;
const NAV_CACHE = `nav-${VERSION}`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, IMG_CACHE, NAV_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(NAV_CACHE);
  try {
    const res = await Promise.race([fetch(request), timeout(6000)]);
    if (res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
      return res;
    }
    throw new Error("bad-response");
  } catch {
    const cached = await cache.match(request) || await cache.match("/");
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return (
      offline ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch {
    return cached || new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin. Cross-origin (Supabase, third party) goes direct.
  if (url.origin !== self.location.origin) return;

  // Never cache server functions / API state mutations.
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/public/img")) {
      event.respondWith(cacheFirst(req, IMG_CACHE));
    }
    return;
  }

  // Navigation requests (HTML documents).
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Static assets (scripts, styles, fonts, images).
  const dest = req.destination;
  if (["script", "style", "font", "image"].includes(dest)) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
  }
});
