import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

export class InventoryConnector implements AIConnector {
  name = "inventory";
  async connect(): Promise<boolean> {
    return true;
  }
  async health(): Promise<AIConnectorHealth> {
    return { status: "online" };
  }
  async handle(event: AIConnectorEvent): Promise<void> {
    if (event.event_type !== "STOCK_LOW") return;
    // Sun tick + inventory_agent already handle STOCK_LOW; no side effect here.
  }
}
