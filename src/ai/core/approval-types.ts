// Client-safe shared types for the approval workflow.
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalListItem {
  id: string;
  agent_id: string;
  action_type: string;
  customer_message: string | null;
  ai_confidence: number | null;
  ai_risk_score: number | null;
  payload: Record<string, unknown>;
  status: AgentApprovalStatus;
  created_at: string;
}
