import { EventBus } from "./event-bus";
import { AgentRegistry } from "./agent-registry";
import { routeEvent } from "./event-router";
import { DecisionEngine } from "./decision-engine";

/**
 * SunEngine — orchestrates the pending queue: route → agent.execute → decision log.
 * NOTE: no auto-run on import. Callers (server fn / admin dashboard) trigger `ignite()`.
 */
export class SunEngine {
  constructor(
    private bus = new EventBus(),
    private registry = new AgentRegistry(),
    private decision = new DecisionEngine(),
  ) {}

  registerAgent = (agent: Parameters<AgentRegistry["register"]>[0]) =>
    this.registry.register(agent);

  async ignite() {
    const events = await this.bus.getPending();
    const decisions: unknown[] = [];

    for (const event of events) {
      const agentName = routeEvent(event);
      if (!agentName) continue;
      const agent = this.registry.get(agentName);
      if (!agent) continue;

      try {
        const result = await agent.execute(event);
        const decision = this.decision.evaluate(result);
        decisions.push({ event_id: event.id, agent: agentName, ...decision });
      } catch (err) {
        decisions.push({
          event_id: event.id,
          agent: agentName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { processed: decisions.length, decisions };
  }
}
