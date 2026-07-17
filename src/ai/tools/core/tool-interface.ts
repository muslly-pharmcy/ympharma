/**
 * AI Tool Universe — Phase 4 interface.
 * Tools are server-side capabilities agents can invoke; mutations
 * default to `requires_approval=true` and land in agent_approval_requests.
 */
export interface AIToolContext {
  agent: string;
  grantedPermissions: string[];
  correlationId?: string;
}

export interface AIToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  requires_approval?: boolean;
  approval_request_id?: string;
}

export interface AITool {
  name: string;
  description: string;
  permissions: string[];
  mutates?: boolean;
  execute(input: unknown, ctx: AIToolContext): Promise<AIToolResult>;
}
