import { AgentRegistry } from "./core/agent-registry";
import { PharmacistAgent } from "./agents/medical/pharmacist-agent";

/**
 * Global agent registry — populated on module load.
 * Phase 1.2 registers only the PharmacistAgent; inventory/customer/sales
 * agents land in later phases. Unknown-agent events remain queued in
 * ai_events (status='pending') rather than failing.
 */
export const registry = new AgentRegistry();

registry.register(new PharmacistAgent());
