// Network-quality detection tuned for YemenNet / TeleYemen.
// Uses the Network Information API where available, and degrades gracefully.

export type NetQuality = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

interface NavigatorConnection {
  effectiveType?: NetQuality;
  saveData?: boolean;
  downlink?: number; // Mbps
  rtt?: number;      // ms
  addEventListener?: (type: "change", l: () => void) => void;
  removeEventListener?: (type: "change", l: () => void) => void;
}

function getConn(): NavigatorConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as { connection?: NavigatorConnection }).connection
    || (navigator as unknown as { mozConnection?: NavigatorConnection }).mozConnection
    || (navigator as unknown as { webkitConnection?: NavigatorConnection }).webkitConnection;
}

export function getNetQuality(): NetQuality {
  return getConn()?.effectiveType ?? "unknown";
}

export function isSaveData(): boolean {
  return Boolean(getConn()?.saveData);
}

export function isSlowNetwork(): boolean {
  const q = getNetQuality();
  return q === "slow-2g" || q === "2g" || isSaveData();
}

// Recommended image upload params based on current connection.
export function recommendedUploadParams(): { maxWidth: number; maxHeight: number; quality: number } {
  if (isSaveData()) return { maxWidth: 1100, maxHeight: 1100, quality: 0.68 };
  const q = getNetQuality();
  switch (q) {
    case "slow-2g": return { maxWidth: 900,  maxHeight: 900,  quality: 0.62 };
    case "2g":      return { maxWidth: 1100, maxHeight: 1100, quality: 0.68 };
    case "3g":      return { maxWidth: 1400, maxHeight: 1400, quality: 0.76 };
    default:        return { maxWidth: 1600, maxHeight: 1600, quality: 0.82 };
  }
}

export function onNetworkChange(cb: () => void): () => void {
  const c = getConn();
  c?.addEventListener?.("change", cb);
  return () => c?.removeEventListener?.("change", cb);
}
