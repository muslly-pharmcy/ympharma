import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface InsightRow {
  id: string;
  insight_type: string;
  summary: string;
  recommendation: Record<string, unknown>;
  confidence: number;
  agent_name: string | null;
  created_at: string;
}

async function ensureAdmin(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
}) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("FORBIDDEN");
}

export const businessInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    executive: InsightRow | null;
    byType: Record<string, InsightRow[]>;
  }> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("ai_business_insights")
      .select(
        "id, insight_type, summary, recommendation, confidence, agent_name, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80);

    const rows = ((data ?? []) as InsightRow[]).map((r) => ({
      id: r.id,
      insight_type: r.insight_type,
      summary: r.summary,
      recommendation: (r.recommendation ?? {}) as Record<string, unknown>,
      confidence: Number(r.confidence ?? 0),
      agent_name: r.agent_name,
      created_at: r.created_at,
    }));

    const executive = rows.find((r) => r.insight_type === "EXECUTIVE") ?? null;
    const byType: Record<string, InsightRow[]> = {
      FINANCIAL: [],
      SALES: [],
      MARKET: [],
    };
    for (const r of rows) {
      if (byType[r.insight_type]) byType[r.insight_type].push(r);
    }
    return { executive, byType };
  });
