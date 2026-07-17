import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

/**
 * POST /api/public/ai/business-tick
 *
 * Cron-authenticated tick that runs the Phase 6 Business Intelligence agents
 * sequentially: CFO → BI Sales → Market → CEO rollup. Each writes to
 * ai_business_insights. No user-facing data is returned; only counts.
 */
export const Route = createFileRoute("/api/public/ai/business-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) return denied;

        const { CFOAgent } = await import(
          "@/ai/intelligence/finance/cfo-agent"
        );
        const { BiSalesAgent } = await import(
          "@/ai/intelligence/sales/bi-sales-agent"
        );
        const { MarketAgent } = await import(
          "@/ai/intelligence/market/market-agent"
        );
        const { CEOAgent } = await import(
          "@/ai/intelligence/executive/ceo-agent"
        );

        const evt = {
          event_type: "DAILY_REPORT",
          source: "cron",
          payload: {},
        };

        const results: Record<string, unknown> = {};
        const errors: string[] = [];

        for (const agent of [
          new CFOAgent(),
          new BiSalesAgent(),
          new MarketAgent(),
          new CEOAgent(),
        ]) {
          try {
            results[agent.name] = await agent.execute(evt);
          } catch (e) {
            errors.push(
              `${agent.name}: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        return Response.json({ ok: errors.length === 0, results, errors });
      },
    },
  },
});
