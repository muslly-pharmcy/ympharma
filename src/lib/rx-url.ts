// Helpers for prescription image URLs.
// Now uses Public URLs (no expiration) instead of Signed URLs.
// Public URL shape: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// Legacy Signed URL shape: https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=<JWT>

import { supabase } from "@/integrations/supabase/client";

export const RX_SIGNED_TTL_SECONDS = 60 * 60 * 24 * 30; // legacy, kept for compatibility

export type RxUrlInfo = {
  url: string;
  bucket: string | null;
  path: string | null;
  expiresAt: Date | null;
  expired: boolean;
  expiresInMs: number | null;
  isPublic: boolean;
};

function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch { return null; }
}

export function parseSignedUrl(url: string): RxUrlInfo {
  const info: RxUrlInfo = { url, bucket: null, path: null, expiresAt: null, expired: false, expiresInMs: null, isPublic: false };
  try {
    const u = new URL(url);
    const pub = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (pub) {
      info.bucket = pub[1];
      info.path = decodeURIComponent(pub[2]);
      info.isPublic = true;
      return info;
    }
    const m = u.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
    if (m) { info.bucket = m[1]; info.path = decodeURIComponent(m[2]); }
    const token = u.searchParams.get("token");
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload?.exp) {
        const exp = new Date(payload.exp * 1000);
        info.expiresAt = exp;
        const diff = exp.getTime() - Date.now();
        info.expiresInMs = diff;
        info.expired = diff <= 0;
      }
      if (!info.path && payload?.url) {
        const parts = String(payload.url).split("/");
        info.bucket = parts.shift() ?? null;
        info.path = parts.join("/");
      }
    }
  } catch { /* invalid url */ }
  return info;
}

export function formatExpiry(info: RxUrlInfo): { label: string; tone: "ok" | "warn" | "expired" | "unknown" } {
  if (info.isPublic) return { label: "دائم (Public)", tone: "ok" };
  if (!info.expiresAt) return { label: "غير معروف", tone: "unknown" };
  if (info.expired) return { label: `منتهي منذ ${humanDelta(-info.expiresInMs!)}`, tone: "expired" };
  const days = info.expiresInMs! / 86_400_000;
  const tone = days < 3 ? "warn" : "ok";
  return { label: `صالح ${humanDelta(info.expiresInMs!)}`, tone };
}

function humanDelta(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

// Converts any legacy Signed URL to a Public URL for the same object.
// Returns the input unchanged if already public.
export async function regenerateSignedUrl(oldUrl: string): Promise<string> {
  const info = parseSignedUrl(oldUrl);
  if (info.isPublic) return oldUrl;
  if (!info.bucket || !info.path) throw new Error("تعذر استخراج مسار الملف من الرابط");
  const { data } = supabase.storage.from(info.bucket).getPublicUrl(info.path);
  if (!data?.publicUrl) throw new Error("فشل إنشاء رابط عام");
  return data.publicUrl;
}

export async function checkUrlReachable(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number | null; ms: number; error?: string }> {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, cache: "no-store" });
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - start) };
  } catch (e: any) {
    return { ok: false, status: null, ms: Math.round(performance.now() - start), error: e?.name === "AbortError" ? "انتهت المهلة" : (e?.message || "فشل الاتصال") };
  } finally { clearTimeout(t); }
}

