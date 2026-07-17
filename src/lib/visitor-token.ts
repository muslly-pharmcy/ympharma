const KEY = "musalli_visitor_token";

export function getOrCreateVisitorToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let t = window.localStorage.getItem(KEY);
    if (!t) {
      t = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      window.localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return null;
  }
}
