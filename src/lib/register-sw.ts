// Register the offline-first service worker (browser only).
// Crucial for users on YemenNet / TeleYemen where the network is unreliable:
// after the first successful visit the app keeps loading from cache even
// when TLS handshakes fail or pages time out.
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Only register on HTTPS or localhost (SW requirement).
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // Non-fatal — site still works without SW, just no offline cache.
        console.warn("[sw] registration failed:", err);
      });
  });
}
