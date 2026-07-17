import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

export class WhatsAppConnector implements AIConnector {
  name = "whatsapp";
  async connect(): Promise<boolean> {
    return true;
  }
  async health(): Promise<AIConnectorHealth> {
    const configured = Boolean(
      process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET,
    );
    return { status: configured ? "online" : "degraded", metrics: { configured } };
  }
  async handle(_event: AIConnectorEvent): Promise<void> {
    // The WhatsApp brain webhook handles inbound; nothing to do here.
  }
}
