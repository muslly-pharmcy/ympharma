// Lightweight client-side activity log for prescription actions.
// Persists last N entries to localStorage so admins can see what happened
// recently (delete / archive / status change) even after a refresh.

export type RxActivityEntry = {
  id: string;            // unique entry id (timestamp+rand)
  rxId: string;          // affected prescription id
  action: "delete" | "archive" | "status" | "bulk-delete" | "bulk-archive";
  details?: string;      // e.g. previous → new status, or reason
  status: "success" | "error";
  error?: string;
  at: number;            // epoch ms
};

const KEY = "rx-activity-log-v1";
const MAX = 80;

type Listener = (entries: RxActivityEntry[]) => void;
const listeners = new Set<Listener>();

function read(): RxActivityEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(entries: RxActivityEntry[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX))); } catch { /* quota */ }
  listeners.forEach((l) => { try { l(entries.slice(0, MAX)); } catch { /* noop */ } });
}

export function getActivityLog(): RxActivityEntry[] { return read(); }

export function logActivity(e: Omit<RxActivityEntry, "id" | "at"> & { at?: number }) {
  const entry: RxActivityEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: e.at ?? Date.now(),
    rxId: e.rxId,
    action: e.action,
    details: e.details,
    status: e.status,
    error: e.error,
  };
  const next = [entry, ...read()].slice(0, MAX);
  write(next);
  return entry;
}

export function clearActivityLog() { write([]); }

export function subscribeActivityLog(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function actionLabel(a: RxActivityEntry["action"]): string {
  switch (a) {
    case "delete": return "حذف";
    case "archive": return "أرشفة";
    case "status": return "تغيير حالة";
    case "bulk-delete": return "حذف جماعي";
    case "bulk-archive": return "أرشفة جماعية";
  }
}
