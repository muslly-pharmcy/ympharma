import { BaseAgent } from "@/ai/agents/base-agent";
import type { AIEvent } from "@/ai/core/types";

/**
 * MarketAgent — surfaces category-level opportunities (expiring stock,
 * dead SKUs). Real competitor scraping is out of scope for v1.
 */
export class MarketAgent extends BaseAgent {
  name = "market_agent";
  role = "market_intelligence";
  capabilities = ["category.analyze", "opportunity.detect"];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("market intelligence", { event_type: event.event_type });
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const d90 = new Date(Date.now() + 90 * 86_400_000).toISOString();
    const { data: expiring } = await supabaseAdmin
      .from("inv_stock_batches")
      .select("product_id, quantity, expiry_date")
      .lte("expiry_date", d90)
      .gt("quantity", 0)
      .limit(20);

    const opportunities = (expiring ?? []).length;
    await supabaseAdmin.from("ai_business_insights").insert({
      insight_type: "MARKET",
      summary: `${opportunities} فرصة تسويق لدفعات مقتربة من الانتهاء.`,
      recommendation: {
        action: opportunities > 0 ? "PROMOTE_EXPIRING" : "NO_ACTION",
        channel: "whatsapp",
      },
      metrics: { opportunities },
      confidence: 0.8,
      agent_name: this.name,
    });

    return {
      type: "MARKET_ANALYSIS",
      opportunities,
      confidence: 0.8,
    };
  }
}
