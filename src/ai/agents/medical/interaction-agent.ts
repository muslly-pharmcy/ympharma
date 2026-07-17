import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

/**
 * InteractionAgent — drug-drug interaction check stub.
 * Real check is Gemini-backed via `drug_info` tool in Phase 4.
 */
export class InteractionAgent extends BaseAgent {
  name = "interaction_agent";
  role = "clinical.interaction";
  capabilities = ["drug.info.read", "interaction.check"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as { medications?: string[] };
    const meds = Array.isArray(payload.medications) ? payload.medications : [];
    return {
      type: "INTERACTION_CHECK",
      result: {
        medications: meds,
        interactions: [],
        risk: meds.length >= 2 ? "review" : "low",
      },
      confidence: 0.8,
    };
  }
}
