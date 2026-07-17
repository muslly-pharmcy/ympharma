/**
 * MUSLLY AI SUN CORE — shared types (blueprint v1.0)
 */
export type AIEventPriority = "low" | "normal" | "high" | "critical";
export type AIEventStatus = "pending" | "processing" | "completed" | "failed";

export interface AIEvent {
  id?: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  priority?: AIEventPriority;
  target_agent?: string;
}

export interface AIAgent {
  name: string;
  role: string;
  capabilities: string[];
  execute(event: AIEvent): Promise<unknown>;
}

export interface AIDecision {
  confidence: number;
  action: unknown;
  timestamp: Date;
}
