// Wrap setInterval to skip ticks when the tab is hidden — saves CPU/battery
// and avoids needless network traffic on long-lived background pages.
export function setVisibilityInterval(fn: () => void, ms: number): () => void {
  const id = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    fn();
  }, ms);
  return () => clearInterval(id);
}
