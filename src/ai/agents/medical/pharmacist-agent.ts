import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

/**
 * PharmacistAgent — Phase 1.2 skeleton.
 * Real Gemini analysis is wired in Phase 2. For now returns a deterministic
 * review-required decision so the Sun pipeline is exercisable end-to-end.
 */
export class PharmacistAgent extends BaseAgent {
  name = "pharmacist_agent";
  role = "clinical.pharmacist";
  capabilities = ["prescription.analyze", "interaction.check"];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("analyzing prescription", { event_id: event.id });
    const payload = (event.payload ?? {}) as {
      medications?: unknown[];
      prescription_id?: string;
    };
    return {
      type: "PRESCRIPTION_ANALYSIS",
      result: {
        status: "review_required",
        prescription_id: payload.prescription_id ?? null,
        medications: Array.isArray(payload.medications) ? payload.medications : [],
        warnings: [],
      },
      confidence: 0.92,
    };
  }
}
