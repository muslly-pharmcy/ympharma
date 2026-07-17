import type { AIAgent, AIEvent } from "../core/types";

/**
 * BaseAgent — abstract superclass implementing the AIAgent interface.
 * Concrete agents extend this and implement `execute`.
 */
export abstract class BaseAgent implements AIAgent {
  abstract name: string;
  abstract role: string;
  abstract capabilities: string[];

  abstract execute(event: AIEvent): Promise<unknown>;

  protected log(message: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.log(`[agent:${this.name}] ${message}`, meta ?? "");
  }
}
