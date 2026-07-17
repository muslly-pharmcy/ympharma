import type { Action, Severity } from "../events/security-events";

export interface RiskResult {
  score: number;
  severity: Severity;
  action: Action;
}

export class SecurityEngine {
  analyze(event: { type: string; details?: Record<string, unknown> }): RiskResult {
    const score = this.calculateRisk(event);
    const severity: Severity =
      score >= 80 ? "critical" : score >= 60 ? "high" : score >= 30 ? "medium" : "low";
    const action: Action =
      severity === "critical" ? "BLOCK" : severity === "high" ? "REVIEW" : "ALLOW";
    return { score, severity, action };
  }

  private calculateRisk(event: { type: string; details?: Record<string, unknown> }): number {
    let score = 0;
    const t = event.type.toUpperCase();
    if (t.includes("FAILED")) score += 30;
    if (t.includes("UNAUTHORIZED")) score += 60;
    if (t.includes("RLS")) score += 70;
    if (t.includes("SECRET")) score += 80;
    if (t.includes("SUSPICIOUS")) score += 45;
    if (t.includes("ANOMALY")) score += 40;
    const attempts = Number(event.details?.attempts ?? 0);
    if (attempts > 5) score += 20;
    return Math.min(score, 100);
  }
}
