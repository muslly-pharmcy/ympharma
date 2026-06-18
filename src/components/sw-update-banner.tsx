import { useEffect, useState } from "react";

/**
 * Floating banner that appears when a new service-worker version is waiting.
 * Clicking "تحديث" triggers SKIP_WAITING + automatic reload.
 */
export function SwUpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__SW_UPDATE_READY__) setReady(true);
    const onReady = () => setReady(true);
    window.addEventListener("sw:updateready", onReady);
    return () => window.removeEventListener("sw:updateready", onReady);
  }, []);

  if (!ready) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 rounded-full border border-primary/20 bg-card px-4 py-2 shadow-lg"
    >
      <span className="text-sm text-foreground">يتوفّر إصدار جديد من الموقع</span>
      <button
        type="button"
        onClick={() => window.__SW_APPLY_UPDATE__?.()}
        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        تحديث
      </button>
    </div>
  );
}
