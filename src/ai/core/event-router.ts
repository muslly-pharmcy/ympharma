import type { AIEvent } from "./types";
import { AI_EVENTS } from "../events/event-types";

/**
 * Deterministic router: event_type → agent name (or null when unmapped).
 * Explicit `target_agent` on the event always wins.
 */
const ROUTES: Record<string, string> = {
  [AI_EVENTS.PRESCRIPTION_UPLOADED]: "pharmacist_agent",
  [AI_EVENTS.STOCK_LOW]: "inventory_agent",
  [AI_EVENTS.LOW_STOCK_PREDICTED]: "inventory_agent",
  [AI_EVENTS.PURCHASE_RECOMMENDED]: "inventory_agent",
  [AI_EVENTS.DEAD_STOCK_DETECTED]: "inventory_agent",
  [AI_EVENTS.EXPIRY_WARNING]: "inventory_agent",
  [AI_EVENTS.CUSTOMER_MESSAGE]: "customer_agent",
  [AI_EVENTS.WHATSAPP_INBOUND]: "customer_agent",
  [AI_EVENTS.ORDER_CREATED]: "sales_agent",
  [AI_EVENTS.SALES_ORDER_CREATED]: "sales_agent",
  [AI_EVENTS.ORDER_PAID]: "sales_agent",
};

export function routeEvent(event: AIEvent): string | null {
  if (event.target_agent) return event.target_agent;
  return ROUTES[event.event_type] ?? null;
}
