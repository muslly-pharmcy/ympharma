import type { AIEvent } from "./types";

/**
 * Deterministic router: maps event_type → agent name (or null when unknown).
 */
export function routeEvent(event: AIEvent): string | null {
  // Explicit override wins.
  if (event.target_agent) return event.target_agent;

  switch (event.event_type) {
    case "PRESCRIPTION_UPLOADED":
      return "pharmacist_agent";
    case "STOCK_LOW":
    case "LOW_STOCK_PREDICTED":
    case "PURCHASE_RECOMMENDED":
    case "DEAD_STOCK_DETECTED":
      return "inventory_agent";
    case "CUSTOMER_MESSAGE":
    case "WHATSAPP_INBOUND":
      return "customer_agent";
    default:
      return null;
  }
}
