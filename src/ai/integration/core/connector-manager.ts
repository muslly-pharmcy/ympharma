import type { AIConnector, AIConnectorEvent } from "./connector-interface";

export class ConnectorManager {
  private connectors = new Map<string, AIConnector>();

  register(connector: AIConnector) {
    this.connectors.set(connector.name, connector);
  }

  get(name: string) {
    return this.connectors.get(name);
  }

  list(): AIConnector[] {
    return Array.from(this.connectors.values());
  }

  async broadcast(event: AIConnectorEvent) {
    await Promise.allSettled(
      Array.from(this.connectors.values()).map((c) => c.handle(event)),
    );
  }
}
