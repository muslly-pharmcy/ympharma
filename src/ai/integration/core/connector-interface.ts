export interface AIConnectorHealth {
  status: "online" | "degraded" | "offline";
  metrics?: Record<string, unknown>;
}

export interface AIConnectorEvent {
  event_type: string;
  payload: Record<string, unknown>;
}

export interface AIConnector {
  name: string;
  connect(): Promise<boolean>;
  health(): Promise<AIConnectorHealth>;
  handle(event: AIConnectorEvent): Promise<void>;
}
