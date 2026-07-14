// Yemen-aware phone normalization to E.164.
// Handles: local (7xxxxxxxx), 00967, +967, spaces, dashes, Arabic-Indic digits.

const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EASTERN_ARABIC = /[\u06F0-\u06F9]/g;

function foldDigits(s: string): string {
  return s
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizePhoneYE(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = foldDigits(String(raw)).replace(/[^\d+]/g, "");
  if (!s) return null;
  // +967… or 00967…
  if (s.startsWith("+967")) return "+" + s.slice(1).replace(/^\+/, "");
  if (s.startsWith("00967")) return "+" + s.slice(2);
  if (s.startsWith("967") && s.length >= 12) return "+" + s;
  // Local 7xxxxxxxx or 07xxxxxxxx (mobile) or 2/3/4/5 landlines
  if (s.startsWith("+")) return s;
  const trimmed = s.replace(/^0+/, "");
  if (/^[1-9]\d{7,9}$/.test(trimmed)) return "+967" + trimmed;
  // fallback: return digits with + if long enough
  return s.length >= 7 ? "+" + s.replace(/^\+/, "") : null;
}

export function phoneDigits(raw: string | null | undefined): string {
  if (!raw) return "";
  return foldDigits(String(raw)).replace(/\D/g, "");
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  // Match on last 9 digits (mobile local part)
  return da.slice(-9) === db.slice(-9);
}
