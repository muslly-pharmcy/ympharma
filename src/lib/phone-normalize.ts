// Phase 6C — Yemeni phone normalization (mirrors enqueue_customer_*_notification SQL).
// Returns "967XXXXXXXXX" or null when input is too short / invalid.
export function normalizeYemenPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0") && n.length === 10) n = "967" + n.slice(1);
  if (n.length === 9) n = "967" + n;
  if (n.length < 9) return null;
  return n;
}
