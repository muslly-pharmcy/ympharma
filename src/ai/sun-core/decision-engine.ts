// ☀️ Decision Engine — pure classifier that wraps SuperBrainSovereign
// when the event carries a user-facing input, otherwise emits a
// lightweight deterministic decision per agent.
import type { SunAgentCode } from "./agent-registry";

export interface SunDecision {
  agent: SunAgentCode | "sun_core";
  action: string;
  confidence: number; // 0..100
  reasoning: string;
  metadata: Record<string, unknown>;
}

export function classifyForAgent(
  agent: SunAgentCode,
  eventName: string,
  payload: Record<string, unknown> | null,
): SunDecision {
  const base = { metadata: { eventName, payload: payload ?? {} } };
  switch (agent) {
    case "pharmacist":
      return {
        agent,
        action: "review_prescription",
        confidence: 92,
        reasoning: "PrescriptionUploaded → dispatch pharmacist for AI review.",
        ...base,
      };
    case "inventory":
      return {
        agent,
        action: "recompute_stock_signal",
        confidence: 88,
        reasoning: "Inventory movement — recompute demand/restock signals.",
        ...base,
      };
    case "revenue":
      return {
        agent,
        action: "analyze_order_margin",
        confidence: 85,
        reasoning: "Order lifecycle — evaluate margin & upsell candidates.",
        ...base,
      };
    case "customer_galaxy":
      return {
        agent,
        action: "engage_customer",
        confidence: 80,
        reasoning: "Customer channel event — schedule follow-up/upsell.",
        ...base,
      };
    case "security_guardian":
      return {
        agent,
        action: "investigate_anomaly",
        confidence: 95,
        reasoning: "Security signal detected — investigate & optionally block.",
        ...base,
      };
    default:
      return {
        agent: "sun_core",
        action: "observe",
        confidence: 50,
        reasoning: "No specialised agent — Sun Core observes.",
        ...base,
      };
  }
}
