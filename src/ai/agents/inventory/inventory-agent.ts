import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class InventoryAgent extends BaseAgent {
  name = "inventory_agent";
  role = "inventory.intelligence";
  capabilities = ["inventory.read", "inventory.predict"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as {
      product_id?: string;
      quantity?: number;
      minimum?: number;
    };
    const qty = Number(payload.quantity ?? 0);
    const min = Number(payload.minimum ?? 0);
    const action = qty <= min ? "reorder_required" : "monitor";
    return {
      type: "INVENTORY_DECISION",
      result: { product_id: payload.product_id ?? null, action, quantity: qty, minimum: min },
      confidence: 0.9,
    };
  }
}
