// Remove only the legacy MUSLLY PWA runtime caches, not queued transactions or IndexedDB.
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    "html-navigations", "api-cache", "static-assets",
  ].map((name) => caches.delete(name))));
});
