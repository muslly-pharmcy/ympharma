// Al-Musalli Push Service Worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'المصلي الصحي', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'المصلي الصحي';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: { url: data.url || '/', deliveryId: data.deliveryId },
    tag: data.tag,
    dir: 'rtl',
    lang: 'ar',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const deliveryId = event.notification.data?.deliveryId;
  event.waitUntil((async () => {
    if (deliveryId) {
      try {
        await fetch('/api/public/engagement/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deliveryId, event: 'clicked' }),
          keepalive: true,
        });
      } catch { /* noop */ }
    }
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find((c) => c.url.includes(url));
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});
