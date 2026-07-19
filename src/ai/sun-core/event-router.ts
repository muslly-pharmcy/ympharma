// ☀️ Event Router — routes an incoming event to one or more agents.
// Phase 1 (ALIGN): resolves through the canonical identity map first,
// then falls back to the legacy in-memory registry for backwards compat.
import { findAgentsForEvent, type SunAgentCode } from "./agent-registry";
import { agentsForEvent } from "@/ai/identity/agent-map";

export interface RoutedEvent {
  eventName: string;
  agents: SunAgentCode[];
  priority: "low" | "medium" | "high" | "critical";
}

const CRITICAL = new Set(["SecurityAlert", "AuthAnomaly", "SECURITY_ALERT"]);
const HIGH = new Set([
  "PrescriptionUploaded",
  "PrescriptionReviewRequested",
  "PRESCRIPTION_UPLOADED",
  "PRESCRIPTION_IN_REVIEW",
  "EXPIRY_ALERT_CREATED",
  "EXPIRY_WARNING",
]);

export function routeEvent(eventName: string): RoutedEvent {
  // Canonical map is authoritative; legacy registry is a fallback.
  const canonical = agentsForEvent(eventName) as SunAgentCode[];
  const agents = canonical.length > 0 ? canonical : findAgentsForEvent(eventName);
  const priority: RoutedEvent["priority"] = CRITICAL.has(eventName)
    ? "critical"
    : HIGH.has(eventName)
      ? "high"
      : agents.length > 0
        ? "medium"
        : "low";
  return { eventName, agents, priority };
}
