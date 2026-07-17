import { BaseAgent } from "@/ai/agents/base-agent";
import type { AIEvent } from "@/ai/core/types";

/**
 * BiSalesAgent — Phase 6 growth analyst.
 * Distinct from the transactional `sales_agent` in agents/business.
 */
export class BiSalesAgent extends BaseAgent {
  name = "bi_sales_agent";
  role = "sales_intelligence";
  capabilities = ["growth.analyze", "sku.rank"];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("sales intelligence", { event_type: event.event_type });
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { MetricEngine } = await import(
      "@/ai/intelligence/core/metric-engine.server"
    );
    const { IntelligenceEngine } = await import(
      "@/ai/intelligence/core/intelligence-engine"
    );
    const eng = new MetricEngine(supabaseAdmin);
    const [sales, inv, fin] = await Promise.all([
      eng.salesMetrics(),
      eng.inventoryMetrics(),
      eng.financeMetrics(),
    ]);
    const insights = new IntelligenceEngine().analyze({
      sales,
      inventory: inv,
      finance: fin,
    });

    if (insights.length) {
      await supabaseAdmin.from("ai_business_insights").insert(
        insights.map((i) => ({
          insight_type: i.type,
          summary: i.summary,
          recommendation: i.recommendation as never,
          metrics: { sales, inventory: inv } as never,
          confidence: i.confidence,
          agent_name: this.name,
        })),
      );
    }

    return {
      type: "SALES_OPTIMIZATION",
      insights_count: insights.length,
      growth_pct: sales.growth_pct,
      confidence: 0.9,
    };
  }
}
