import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class SupportAgent extends BaseAgent {
  name = "support_agent";
  role = "customer.support";
  capabilities = ["customer.message", "support.escalate"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as {
      severity?: string;
      customer_id?: string;
    };
    const sev = String(payload.severity ?? "normal");
    const escalate = sev === "high" || sev === "critical";
    return {
      type: "SUPPORT_TRIAGE",
      result: {
        customer_id: payload.customer_id ?? null,
        escalate,
        target: escalate ? "human_agent" : "auto_reply",
      },
      confidence: 0.8,
    };
  }
}
