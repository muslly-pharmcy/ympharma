import { AgentRegistry } from "./core/agent-registry";
import { registerAllAgents } from "./agents/register";

/**
 * Global agent registry — populated on module load.
 * Phase 3 registers the full Agent Universe via `registerAllAgents`.
 */
export const registry = new AgentRegistry();
registerAllAgents(registry);
