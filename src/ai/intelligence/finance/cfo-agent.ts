import { BaseAgent } from "@/ai/agents/base-agent";
import type { AIEvent } from "@/ai/core/types";

/**
 * CFOAgent — pulls sales + invoice metrics via handler-side dynamic import
 * (avoids leaking server-only client into the client bundle).
 */
export class CFOAgent extends BaseAgent {
  name = "cfo_agent";
  role = "financial_intelligence";
  capabilities = ["profit.analyze", "expense.monitor"];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("financial analysis", { event_type: event.event_type });
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { MetricEngine } = await import(
      "@/ai/intelligence/core/metric-engine.server"
    );
    const eng = new MetricEngine(supabaseAdmin);
    const [sales, finance] = await Promise.all([
      eng.salesMetrics(),
      eng.financeMetrics(),
    ]);
    // Very rough profit proxy: revenue - invoice cost.
    const profit = sales.revenue_30d - finance.invoice_total_30d;
    const recommendation =
      profit < 0 ? "Review expenses" : "Optimize growth";

    await supabaseAdmin.from("ai_business_insights").insert({
      insight_type: "FINANCIAL",
      summary: `الربح التقديري خلال 30 يوم: ${profit.toFixed(2)}`,
      recommendation: { action: recommendation, profit } as never,
      metrics: { sales, finance } as never,
      confidence: 0.9,
      agent_name: this.name,
    });

    return {
      type: "FINANCIAL_ANALYSIS",
      profit,
      recommendation,
      confidence: 0.9,
    };
  }
}
