import type { AgentRegistry } from "../core/agent-registry";
import { PharmacistAgent } from "./medical/pharmacist-agent";
import { PrescriptionAgent } from "./medical/prescription-agent";
import { PatientCompanionAgent } from "./medical/patient-companion-agent";
import { InteractionAgent } from "./medical/interaction-agent";
import { InventoryAgent } from "./inventory/inventory-agent";
import { ExpiryAgent } from "./inventory/expiry-agent";
import { ProcurementAgent } from "./inventory/procurement-agent";
import { WhatsappAgent } from "./customer/whatsapp-agent";
import { SupportAgent } from "./customer/support-agent";
import { SalesAgent } from "./business/sales-agent";
import { MarketingAgent } from "./business/marketing-agent";
import { GuardianAgent } from "./security/guardian-agent";

/**
 * Central Agent Universe registration (Phase 3 + Phase 11).
 * Sun bootstrap calls this so every agent is discoverable by name.
 */
export function registerAllAgents(registry: AgentRegistry) {
  registry.register(new PharmacistAgent());
  registry.register(new PrescriptionAgent());
  registry.register(new InteractionAgent());
  registry.register(new PatientCompanionAgent());
  registry.register(new InventoryAgent());
  registry.register(new ExpiryAgent());
  registry.register(new ProcurementAgent());
  registry.register(new WhatsappAgent());
  registry.register(new SupportAgent());
  registry.register(new SalesAgent());
  registry.register(new MarketingAgent());
  registry.register(new GuardianAgent());
}

export const ALL_AGENT_NAMES = [
  "pharmacist_agent",
  "prescription_agent",
  "interaction_agent",
  "patient_companion_agent",
  "inventory_agent",
  "expiry_agent",
  "procurement_agent",
  "customer_agent",
  "support_agent",
  "sales_agent",
  "marketing_agent",
  "guardian_agent",
] as const;
