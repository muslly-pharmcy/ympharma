// Same-origin image proxy. Many Yemen ISPs (YemenNet/TeleYemen) throttle or
// block images.unsplash.com and other foreign CDNs. Routing images through
// our own domain (muslly.com) makes them load reliably.

const EXTERNAL_HOSTS = [
  "images.unsplash.com",
  "plus.unsplash.com",
  "source.unsplash.com",
  "img.youtube.com",
  "i.imgur.com",
  "images.openfoodfacts.org",
  "static.openfoodfacts.org",
  "world.openfoodfacts.org",
];

export function proxifyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const u = new URL(url);
    if (EXTERNAL_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) {
      return `/api/public/img?u=${encodeURIComponent(url)}`;
    }
    return url;
  } catch {
    return url;
  }
}
