import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class MarketingAgent extends BaseAgent {
  name = "marketing_agent";
  role = "business.marketing";
  capabilities = ["marketing.read", "campaign.read"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as { campaign_id?: string; ctr?: number };
    return {
      type: "MARKETING_INSIGHT",
      result: {
        campaign_id: payload.campaign_id ?? null,
        ctr: Number(payload.ctr ?? 0),
        recommendation: Number(payload.ctr ?? 0) < 0.02 ? "optimize" : "keep",
      },
      confidence: 0.7,
    };
  }
}
