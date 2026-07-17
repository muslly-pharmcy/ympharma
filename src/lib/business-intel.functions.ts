import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface InsightSummary {
  id: string;
  insight_type: string;
  summary: string;
  confidence: number;
  agent_name: string | null;
  created_at: string;
}

export interface ExecutiveSummary extends InsightSummary {
  priorities: string[];
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
    executive: ExecutiveSummary | null;
    financial: InsightSummary[];
    sales: InsightSummary[];
    market: InsightSummary[];
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

    const rows = (data ?? []) as Array<{
      id: string;
      insight_type: string;
      summary: string;
      recommendation: unknown;
      confidence: number;
      agent_name: string | null;
      created_at: string;
    }>;

    const toSummary = (r: (typeof rows)[number]): InsightSummary => ({
      id: r.id,
      insight_type: r.insight_type,
      summary: r.summary,
      confidence: Number(r.confidence ?? 0),
      agent_name: r.agent_name,
      created_at: r.created_at,
    });

    const execRow = rows.find((r) => r.insight_type === "EXECUTIVE") ?? null;
    let executive: ExecutiveSummary | null = null;
    if (execRow) {
      const rec = (execRow.recommendation ?? {}) as { priorities?: unknown };
      const priorities = Array.isArray(rec.priorities)
        ? rec.priorities.filter((p): p is string => typeof p === "string")
        : [];
      executive = { ...toSummary(execRow), priorities };
    }

    return {
      executive,
      financial: rows.filter((r) => r.insight_type === "FINANCIAL").map(toSummary),
      sales: rows.filter((r) => r.insight_type === "SALES").map(toSummary),
      market: rows.filter((r) => r.insight_type === "MARKET").map(toSummary),
    };
  });
