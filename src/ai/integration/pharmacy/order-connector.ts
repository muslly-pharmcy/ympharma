import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

/**
 * OrderConnector — bridges ORDER_CREATED into the agent_events queue
 * as ORDER_ANALYSIS_REQUIRED, which the sales agent picks up on next tick.
 */
export class OrderConnector implements AIConnector {
  name = "orders";
  async connect(): Promise<boolean> {
    return true;
  }
  async health(): Promise<AIConnectorHealth> {
    return { status: "online" };
  }
  async handle(event: AIConnectorEvent): Promise<void> {
    if (event.event_type !== "ORDER_CREATED") return;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("agent_events").insert({
      event_id: crypto.randomUUID(),
      event_name: "ORDER_ANALYSIS_REQUIRED",
      payload: event.payload,
      source: "order_connector",
    });
  }
}
