// Pure expiry risk model. Given batches, returns risk in [0,1].
export interface BatchLite { qtyOnHand: number; expiryDate: string | null }

export function expiryRisk(batches: BatchLite[], asOf: Date = new Date()): number {
  const total = batches.reduce((s, b) => s + b.qtyOnHand, 0);
  if (total <= 0) return 0;
  const now = asOf.getTime();
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const risky = batches.reduce((s, b) => {
    if (!b.expiryDate) return s;
    const t = new Date(b.expiryDate).getTime();
    if (t - now <= 0) return s + b.qtyOnHand;
    if (t - now <= ms90) return s + b.qtyOnHand * 0.75;
    return s;
  }, 0);
  return Math.min(1, risky / total);
}
