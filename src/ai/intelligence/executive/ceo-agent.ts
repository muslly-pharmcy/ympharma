import { BaseAgent } from "@/ai/agents/base-agent";
import type { AIEvent } from "@/ai/core/types";

/**
 * CEOAgent — aggregates the last 24h of business insights into an executive
 * summary card. Runs at the end of the daily tick.
 */
export class CEOAgent extends BaseAgent {
  name = "ceo_agent";
  role = "executive_assistant";
  capabilities = ["insights.aggregate", "priorities.rank"];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("executive rollup", { event_type: event.event_type });
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data } = await supabaseAdmin
      .from("ai_business_insights")
      .select("insight_type, summary, confidence")
      .gte("created_at", since)
      .neq("insight_type", "EXECUTIVE")
      .order("confidence", { ascending: false })
      .limit(20);

    const priorities = (data ?? []).slice(0, 5).map((r) => r.summary);

    await supabaseAdmin.from("ai_business_insights").insert({
      insight_type: "EXECUTIVE",
      summary: `تم تحليل ${data?.length ?? 0} مؤشر خلال 24 ساعة.`,
      recommendation: { priorities } as never,
      metrics: { total: data?.length ?? 0 } as never,
      confidence: 0.95,
      agent_name: this.name,
    });

    return {
      type: "EXECUTIVE_SUMMARY",
      priorities_count: priorities.length,
      confidence: 0.95,
    };
  }
}
