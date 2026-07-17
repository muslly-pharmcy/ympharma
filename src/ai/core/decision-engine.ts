import type { AIDecision } from "./types";

export class DecisionEngine {
  evaluate(result: unknown): AIDecision {
    return {
      confidence: 0.95,
      action: result,
      timestamp: new Date(),
    };
  }
}
