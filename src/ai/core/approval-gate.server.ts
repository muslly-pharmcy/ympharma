/**
 * Wave A · Approval Gate — server-only helper.
 *
 * Wraps public.agent_approval_requests so agents can defer risky writes
 * behind an admin-approval workflow instead of executing directly.
 *
 * Filename ends in `.server.ts` so the client bundle protection refuses
 * to import it — only server functions / server routes may consume it.
 */
import type { AgentApprovalStatus } from "./approval-types";

type AllowedAction =
  | "create_order"
  | "approve_prescription"
  | "inventory_change"
  | "transfer"
  | "price_change"
  | "refund";

export interface RequestApprovalInput {
  agentId: string;
  actionType: AllowedAction;
  payload: Record<string, unknown>;
  customerMessage?: string;
  correlationId?: string;
  userPhone?: string;
  aiConfidence?: number;
  aiAnalysis?: Record<string, unknown>;
}

export interface ApprovalRow {
  id: string;
  status: AgentApprovalStatus;
  action_type: string;
  payload: Record<string, unknown>;
}

/**
 * Persist an approval request. Returns the pending row.
 * The action is NOT executed here — call executeIfApproved() after an
 * admin decides via the /admin-agent-universe Approvals tab.
 */
export async function requestApproval(input: RequestApprovalInput): Promise<ApprovalRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("agent_approval_requests")
    .insert({
      agent_id: input.agentId,
      action_type: input.actionType,
      payload: input.payload as never,
      customer_message: input.customerMessage ?? null,
      correlation_id: input.correlationId ?? null,
      user_phone: input.userPhone ?? null,
      ai_confidence: input.aiConfidence ?? null,
      ai_analysis: (input.aiAnalysis ?? null) as never,
      status: "pending",
    })
    .select("id, status, action_type, payload")
    .single();
  if (error) throw error;
  return data as unknown as ApprovalRow;
}

/**
 * If the approval is in "approved" state, run `executor(payload)` exactly once
 * and stamp the audit trail. Returns the executor result, or null when not
 * yet approved / already handled.
 */
export async function executeIfApproved<T>(
  approvalId: string,
  executor: (payload: Record<string, unknown>) => Promise<T>,
): Promise<T | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row, error: readErr } = await supabaseAdmin
    .from("agent_approval_requests")
    .select("id, status, action_type, payload, agent_id")
    .eq("id", approvalId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) return null;
  if (row.status !== "approved") return null;

  const payload = (row.payload ?? {}) as Record<string, unknown>;

  const result = await executor(payload);

  // Best-effort audit stamp. Existing ai_security_audit schema:
  // actor, actor_id, action, resource, result, metadata.
  await supabaseAdmin.from("ai_security_audit").insert({
    actor: row.agent_id,
    action: `execute:${row.action_type}`,
    resource: `approval:${row.id}`,
    result: "executed",
    metadata: { payload } as never,
  });

  return result;
}
