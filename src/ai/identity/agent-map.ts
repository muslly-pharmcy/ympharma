// ============================================================
// TITANUS AI IDENTITY MAP — Phase 1 (ALIGN)
// ------------------------------------------------------------
// Single source of truth for AI agent identity.
// Non-destructive: existing DB rows and code names both resolve
// through this map. No renames, no deletes.
//
// One canonical code per logical agent + a set of aliases that
// legacy code / DB rows may still use.
// ============================================================

export type CanonicalAgentCode =
  | "pharmacist"
  | "inventory"
  | "revenue"
  | "customer_galaxy"
  | "security_guardian";

export interface AgentIdentity {
  code: CanonicalAgentCode;
  displayName: string;
  category: "medical" | "inventory" | "commercial" | "customer" | "security";
  aliases: readonly string[];
  /** Event names that resolve to this agent (canonical + legacy). */
  events: readonly string[];
}

export const AGENT_IDENTITIES: readonly AgentIdentity[] = [
  {
    code: "pharmacist",
    displayName: "AI Pharmacist Agent",
    category: "medical",
    aliases: ["pharmacist_agent", "AI Pharmacist Intelligence", "AI Pharmacist Agent"],
    events: [
      "PrescriptionUploaded",
      "PrescriptionReviewRequested",
      "PRESCRIPTION_UPLOADED",
      "PRESCRIPTION_IN_REVIEW",
      "PRESCRIPTION_APPROVED",
      "PRESCRIPTION_ASSIGNED",
    ],
  },
  {
    code: "inventory",
    displayName: "Inventory Intelligence Agent",
    category: "inventory",
    aliases: ["inventory_agent", "Inventory Intelligence Agent"],
    events: [
      "STOCK_RECEIVED",
      "STOCK_MOVEMENT_CREATED",
      "STOCK_LOW",
      "EXPIRY_ALERT_CREATED",
      "EXPIRY_WARNING",
      "TRANSFER_CREATED",
      "TRANSFER_COMPLETED",
      "PURCHASE_RECOMMENDED",
      "LOW_STOCK_PREDICTED",
      "DEAD_STOCK_DETECTED",
    ],
  },
  {
    code: "revenue",
    displayName: "Revenue Agent",
    category: "commercial",
    aliases: ["sales_agent", "revenue_agent", "Revenue Agent"],
    events: [
      "OrderCreated",
      "OrderCompleted",
      "ORDER_CREATED",
      "ORDER_PAID",
      "SALES_ORDER_CREATED",
    ],
  },
  {
    code: "customer_galaxy",
    displayName: "Customer Galaxy Agent",
    category: "customer",
    aliases: [
      "customer_agent",
      "Customer Communication Agent",
      "Customer Galaxy Agent",
    ],
    events: [
      "WhatsAppInbound",
      "WHATSAPP_INBOUND",
      "CustomerInquiry",
      "CUSTOMER_MESSAGE",
    ],
  },
  {
    code: "security_guardian",
    displayName: "Security Guardian Agent",
    category: "security",
    aliases: ["security_guardian_agent", "Security Guardian Agent"],
    events: ["SecurityAlert", "AuthAnomaly", "SECURITY_ALERT"],
  },
] as const;

// -----------------------------------------------------------------
// Resolvers
// -----------------------------------------------------------------
const CODE_INDEX: Map<string, CanonicalAgentCode> = (() => {
  const m = new Map<string, CanonicalAgentCode>();
  for (const a of AGENT_IDENTITIES) {
    m.set(a.code.toLowerCase(), a.code);
    for (const alias of a.aliases) m.set(alias.toLowerCase(), a.code);
  }
  return m;
})();

const EVENT_INDEX: Map<string, CanonicalAgentCode[]> = (() => {
  const m = new Map<string, CanonicalAgentCode[]>();
  for (const a of AGENT_IDENTITIES) {
    for (const evt of a.events) {
      const arr = m.get(evt) ?? [];
      arr.push(a.code);
      m.set(evt, arr);
    }
  }
  return m;
})();

/** Resolve any legacy code / display name / alias → canonical code (or null). */
export function resolveAgentCode(input: string | null | undefined): CanonicalAgentCode | null {
  if (!input) return null;
  return CODE_INDEX.get(input.toLowerCase()) ?? null;
}

/** Return canonical agents subscribed to the given event name. */
export function agentsForEvent(eventName: string): CanonicalAgentCode[] {
  return EVENT_INDEX.get(eventName) ?? [];
}

/** Fetch identity spec by canonical code. */
export function getIdentity(code: CanonicalAgentCode): AgentIdentity | undefined {
  return AGENT_IDENTITIES.find((a) => a.code === code);
}
