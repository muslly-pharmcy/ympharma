/* Service Worker — صيدلية المصلي
 * Offline-first shell tuned for unreliable Yemeni ISPs (YemenNet / TeleYemen).
 *
 * Strategy:
 *   - Pre-cache a versioned app shell on install.
 *   - Navigation: cache-first instant response, revalidate in background;
 *     if no cache, race network against a 5s timeout, then offline.html.
 *   - Static assets (script/style/font/image): stale-while-revalidate.
 *   - /api/public/img: cache-first with long TTL.
 *   - Other /api/ + /_serverFn: never cached.
 *   - SKIP_WAITING message lets the client activate a new SW immediately.
 */

const VERSION = "v5-2026-06-18";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;
const NAV_CACHE = `nav-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, ASSET_CACHE, IMG_CACHE, NAV_CACHE];

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/robots.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll is atomic — if any fails the install aborts. Use Promise.allSettled
      // so a single missing icon doesn't break the whole precache.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: VERSION });
  }
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function cacheFirstNavigation(request) {
  const cache = await caches.open(NAV_CACHE);
  const cached = (await cache.match(request)) || (await cache.match("/"));

  // Background revalidate — never blocks the response to the user.
  const revalidate = (async () => {
    try {
      const fresh = await Promise.race([fetch(request), timeout(8000)]);
      if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    } catch {
      /* offline — ignore */
    }
  })();

  if (cached) {
    revalidate.catch(() => {});
    return cached;
  }

  // No cache yet — try network with timeout, fall back to offline.html.
  try {
    const fresh = await Promise.race([fetch(request), timeout(5000)]);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    }
    throw new Error("bad-response");
  } catch {
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
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/public/img")) {
      event.respondWith(cacheFirst(req, IMG_CACHE));
    }
    return;
  }

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(cacheFirstNavigation(req));
    return;
  }

  if (["script", "style", "font", "image"].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
  }
});
