import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class ExpiryAgent extends BaseAgent {
  name = "expiry_agent";
  role = "inventory.expiry-watch";
  capabilities = ["inventory.read", "expiry.alert.read"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as { batch_id?: string; days_to_expiry?: number };
    const days = Number(payload.days_to_expiry ?? 999);
    const severity = days <= 30 ? "critical" : days <= 90 ? "warning" : "info";
    return {
      type: "EXPIRY_DECISION",
      result: { batch_id: payload.batch_id ?? null, days_to_expiry: days, severity },
      confidence: 0.95,
    };
  }
}
