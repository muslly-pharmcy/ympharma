// ☀️ AI SUN CORE — Agent Registry
// Maps event names → registered agent codes. Pure/in-memory catalog that
// mirrors what is seeded in the `public.ai_agents` table.

export type SunAgentCode =
  | "pharmacist"
  | "inventory"
  | "revenue"
  | "customer_galaxy"
  | "security_guardian";

export interface SunAgentSpec {
  code: SunAgentCode;
  name: string;
  category: string;
  events: readonly string[];
}

export const AGENT_REGISTRY: readonly SunAgentSpec[] = [
  {
    code: "pharmacist",
    name: "AI Pharmacist Agent",
    category: "medical",
    events: ["PrescriptionUploaded", "PrescriptionReviewRequested"],
  },
  {
    code: "inventory",
    name: "Inventory Intelligence Agent",
    category: "inventory",
    events: [
      "STOCK_RECEIVED",
      "STOCK_MOVEMENT_CREATED",
      "EXPIRY_ALERT_CREATED",
      "TRANSFER_CREATED",
      "TRANSFER_COMPLETED",
      "PURCHASE_RECOMMENDED",
      "LOW_STOCK_PREDICTED",
      "DEAD_STOCK_DETECTED",
    ],
  },
  {
    code: "revenue",
    name: "Revenue Agent",
    category: "commercial",
    events: ["OrderCreated", "OrderCompleted"],
  },
  {
    code: "customer_galaxy",
    name: "Customer Galaxy Agent",
    category: "customer",
    events: ["WhatsAppInbound", "CustomerInquiry"],
  },
  {
    code: "security_guardian",
    name: "Security Guardian Agent",
    category: "security",
    events: ["SecurityAlert", "AuthAnomaly"],
  },
] as const;

export function findAgentsForEvent(eventName: string): SunAgentCode[] {
  return AGENT_REGISTRY.filter((a) => a.events.includes(eventName)).map(
    (a) => a.code,
  );
}
