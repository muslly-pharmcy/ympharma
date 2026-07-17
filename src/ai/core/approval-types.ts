// Client-safe shared types for the approval workflow.
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ApprovalListItem {
  id: string;
  agent_id: string;
  action_type: string;
  customer_message: string | null;
  ai_confidence: number | null;
  ai_risk_score: number | null;
  payload: JsonValue;
  status: AgentApprovalStatus;
  created_at: string;
}
