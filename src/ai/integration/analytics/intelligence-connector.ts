import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

export class IntelligenceConnector implements AIConnector {
  name = "analytics";
  async connect(): Promise<boolean> {
    return true;
  }
  async health(): Promise<AIConnectorHealth> {
    return { status: "online" };
  }
  async handle(_event: AIConnectorEvent): Promise<void> {
    // Analytics rollups run on cron; connector is presence-only.
  }
}
