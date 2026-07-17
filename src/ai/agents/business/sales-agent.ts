import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class SalesAgent extends BaseAgent {
  name = "sales_agent";
  role = "business.sales";
  capabilities = ["sales.read", "order.read"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as { order_id?: string; total?: number };
    const total = Number(payload.total ?? 0);
    const tier = total >= 500 ? "vip" : total >= 100 ? "standard" : "small";
    return {
      type: "SALES_ANALYSIS",
      result: { order_id: payload.order_id ?? null, total, tier },
      confidence: 0.85,
    };
  }
}
