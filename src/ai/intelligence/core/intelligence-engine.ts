import type {
  SalesMetrics,
  InventoryMetrics,
  FinanceMetrics,
} from "./metric-engine.server";

export interface Insight {
  type: "FINANCIAL" | "SALES" | "MARKET" | "EXECUTIVE";
  summary: string;
  recommendation: Record<string, unknown>;
  confidence: number;
}

export class IntelligenceEngine {
  analyze(input: {
    sales: SalesMetrics;
    inventory: InventoryMetrics;
    finance: FinanceMetrics;
  }): Insight[] {
    const insights: Insight[] = [];

    if (input.sales.growth_pct < -10) {
      insights.push({
        type: "SALES",
        summary: `تراجع المبيعات ${Math.abs(input.sales.growth_pct)}% خلال 7 أيام.`,
        recommendation: {
          action: "REVIEW_CAMPAIGNS",
          reason: "sales_drop",
        },
        confidence: 0.9,
      });
    } else if (input.sales.growth_pct > 15) {
      insights.push({
        type: "SALES",
        summary: `نمو المبيعات ${input.sales.growth_pct}% — فرصة توسع.`,
        recommendation: { action: "SCALE_TOP_SKUS" },
        confidence: 0.88,
      });
    }

    if (input.inventory.expiring_90d > 20) {
      insights.push({
        type: "MARKET",
        summary: `${input.inventory.expiring_90d} صنف يقترب من الانتهاء خلال 90 يوماً.`,
        recommendation: { action: "PROMOTE_EXPIRING", channel: "whatsapp" },
        confidence: 0.85,
      });
    }

    if (input.inventory.low_stock > 5) {
      insights.push({
        type: "MARKET",
        summary: `${input.inventory.low_stock} تنبيه مخزون منخفض نشط.`,
        recommendation: { action: "REORDER_TOP" },
        confidence: 0.82,
      });
    }

    return insights;
  }
}
