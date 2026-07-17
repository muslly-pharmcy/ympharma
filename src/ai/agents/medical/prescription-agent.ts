import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

/**
 * PrescriptionAgent — routes uploaded prescriptions to the review queue.
 * Deterministic decision; heavy OCR/analysis happens elsewhere.
 */
export class PrescriptionAgent extends BaseAgent {
  name = "prescription_agent";
  role = "clinical.prescription-triage";
  capabilities = ["prescription.read", "prescription.review.queue"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as {
      prescription_id?: string;
      urgent?: boolean;
    };
    return {
      type: "PRESCRIPTION_TRIAGE",
      result: {
        prescription_id: payload.prescription_id ?? null,
        queue: payload.urgent ? "urgent_review" : "standard_review",
      },
      confidence: 0.9,
    };
  }
}
