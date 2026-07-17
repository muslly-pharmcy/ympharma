import type { AIAgent } from "./types";

export class AgentRegistry {
  private agents = new Map<string, AIAgent>();

  register(agent: AIAgent) {
    this.agents.set(agent.name, agent);
  }

  get(name: string) {
    return this.agents.get(name);
  }

  list() {
    return Array.from(this.agents.keys());
  }
}
