// Pure composite score. Mirrors public.inv_intel_snapshot weighting.
export interface HealthInputs {
  stockQty: number;
  reorderThreshold: number;
  velocityDaily: number;
  expiryRisk: number; // 0..1
  marginPct: number | null; // 0..1 or null
}

export interface HealthResult {
  score: number; // 0..100
  status: "healthy" | "warning" | "critical" | "dead";
  daysOfCover: number | null;
  availability: number; // 0..1
}

export function computeHealth(inp: HealthInputs): HealthResult {
  const availability = Math.min(1, inp.stockQty / Math.max(inp.reorderThreshold, 1));
  const daysOfCover = inp.velocityDaily > 0 ? inp.stockQty / inp.velocityDaily : null;
  const velocitySignal = daysOfCover === null ? 0.3 : Math.min(1, Math.max(0, daysOfCover / 14));
  const marginSignal = inp.marginPct ?? 0.5;
  const score =
    100 *
    (0.35 * availability +
      0.25 * (1 - inp.expiryRisk) +
      0.25 * velocitySignal +
      0.15 * marginSignal);

  const status: HealthResult["status"] =
    inp.expiryRisk >= 1 && inp.velocityDaily < 1 / 7
      ? "dead"
      : score < 40 || (daysOfCover !== null && daysOfCover < 3)
        ? "critical"
        : score < 60 || (daysOfCover !== null && daysOfCover < 7)
          ? "warning"
          : "healthy";

  return {
    score: Math.round(score * 100) / 100,
    status,
    daysOfCover: daysOfCover === null ? null : Math.round(daysOfCover * 100) / 100,
    availability,
  };
}

export function recommendationUrgency(
  daysOfCover: number | null,
): "low" | "medium" | "high" | "critical" {
  if (daysOfCover === null) return "low";
  if (daysOfCover < 3) return "critical";
  if (daysOfCover < 7) return "high";
  if (daysOfCover < 14) return "medium";
  return "low";
}
