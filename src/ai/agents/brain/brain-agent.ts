import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";
import { decide } from "@/modules/ai-brain/services/SuperBrainSovereign";
import type { BrainAdapter, BrainInput } from "@/modules/ai-brain/domain/types";

/**
 * BrainAgent — thin wrapper that surfaces the pure SuperBrainSovereign
 * decision core as a first-class agent inside the canonical `src/ai/`
 * registry (Wave B — Unification).
 *
 * The pure core lives at `src/modules/ai-brain/services/SuperBrainSovereign`
 * and stays I/O-free. Callers that want to enrich the decision with real
 * pharmacy/catalog lookups can pass a `BrainAdapter` in the event payload
 * under `payload.__adapter`; otherwise the agent runs adapter-less and
 * returns fallback logistics.
 */
export class BrainAgent extends BaseAgent {
  name = "brain_agent";
  role = "Sovereign drug-safety + geo routing decision core";
  capabilities = [
    "drug_safety_check",
    "chronic_condition_conflict",
    "nearest_pharmacy_routing",
    "maternal_campaign_suggestion",
  ];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as Partial<BrainInput> & {
      __adapter?: BrainAdapter;
    };

    const input: BrainInput = {
      userId: payload.userId ?? "system",
      userInput: payload.userInput ?? "",
      district: payload.district ?? "عدن",
      lat: payload.lat,
      lng: payload.lng,
      patient: payload.patient,
    };

    this.log("decide", { district: input.district, hasAdapter: !!payload.__adapter });
    return decide(input, payload.__adapter);
  }
}
