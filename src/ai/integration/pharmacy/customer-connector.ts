import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

export class CustomerConnector implements AIConnector {
  name = "customer";
  async connect(): Promise<boolean> {
    return true;
  }
  async health(): Promise<AIConnectorHealth> {
    return { status: "online" };
  }
  async handle(_event: AIConnectorEvent): Promise<void> {
    // Customer profile enrichment lives in the pharmacist/support agents.
  }
}
