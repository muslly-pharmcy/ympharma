import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class ProcurementAgent extends BaseAgent {
  name = "procurement_agent";
  role = "inventory.procurement";
  capabilities = ["inventory.read", "procurement.recommend"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as {
      product_id?: string;
      recommended_qty?: number;
      supplier_id?: string;
    };
    return {
      type: "PROCUREMENT_RECOMMENDATION",
      result: {
        product_id: payload.product_id ?? null,
        recommended_qty: Number(payload.recommended_qty ?? 0),
        supplier_id: payload.supplier_id ?? null,
        requires_approval: true,
      },
      confidence: 0.85,
    };
  }
}
