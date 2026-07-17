// ☀️ Event Router — routes an incoming event to one or more agents.
import { findAgentsForEvent, type SunAgentCode } from "./agent-registry";

export interface RoutedEvent {
  eventName: string;
  agents: SunAgentCode[];
  priority: "low" | "medium" | "high" | "critical";
}

const CRITICAL = new Set(["SecurityAlert", "AuthAnomaly"]);
const HIGH = new Set([
  "PrescriptionUploaded",
  "PrescriptionReviewRequested",
  "EXPIRY_ALERT_CREATED",
]);

export function routeEvent(eventName: string): RoutedEvent {
  const agents = findAgentsForEvent(eventName);
  const priority: RoutedEvent["priority"] = CRITICAL.has(eventName)
    ? "critical"
    : HIGH.has(eventName)
      ? "high"
      : agents.length > 0
        ? "medium"
        : "low";
  return { eventName, agents, priority };
}
