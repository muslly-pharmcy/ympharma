import type { SupabaseClient } from "@supabase/supabase-js";
import type { AITool, AIToolContext, AIToolResult } from "./tool-interface";
import { ToolRegistry } from "./tool-registry";
import { canExecute } from "./tool-permission";

/**
 * ToolEngine — resolves a tool by name, enforces permissions, executes,
 * and writes an ai_actions ledger row for every attempt.
 *
 * Mutating tools default to `requires_approval=true`: the engine records
 * an ai_actions row with status='pending_approval' and DOES NOT run the
 * tool. Approval flow (admin review) lives in Phase 4.5 and reuses the
 * existing agent_approval_requests table.
 */
export class ToolEngine {
  constructor(
    private registry: ToolRegistry,
    private db: SupabaseClient,
  ) {}

  getRegistry() {
    return this.registry;
  }

  async execute(
    toolName: string,
    input: unknown,
    ctx: AIToolContext,
  ): Promise<AIToolResult> {
    const tool = this.registry.get(toolName);
    const started = Date.now();

    if (!tool) {
      await this.log({
        agent_name: ctx.agent,
        tool_name: toolName,
        input,
        output: null,
        status: "not_found",
        error_message: "TOOL_NOT_FOUND",
        latency_ms: 0,
      });
      return { ok: false, error: "TOOL_NOT_FOUND" };
    }

    if (!canExecute(tool, ctx.grantedPermissions)) {
      await this.log({
        agent_name: ctx.agent,
        tool_name: toolName,
        input,
        output: null,
        status: "permission_denied",
        error_message: `missing: ${tool.permissions
          .filter((p) => !ctx.grantedPermissions.includes(p))
          .join(",")}`,
        latency_ms: Date.now() - started,
      });
      return { ok: false, error: "PERMISSION_DENIED" };
    }

    // Mutating tools defer to human approval unless the tool itself opts out.
    if (tool.mutates) {
      const { data } = await this.db
        .from("ai_actions")
        .insert({
          agent_name: ctx.agent,
          tool_name: toolName,
          input: (input ?? {}) as Record<string, unknown>,
          status: "pending_approval",
          requires_approval: true,
          latency_ms: Date.now() - started,
        })
        .select("id")
        .single();
      return {
        ok: false,
        requires_approval: true,
        approval_request_id: (data as { id?: string } | null)?.id,
      };
    }

    try {
      const result = await tool.execute(input, ctx);
      await this.log({
        agent_name: ctx.agent,
        tool_name: toolName,
        input,
        output: (result.data ?? result) as Record<string, unknown>,
        status: result.ok ? "completed" : "failed",
        error_message: result.ok ? null : (result.error ?? "unknown"),
        latency_ms: Date.now() - started,
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.log({
        agent_name: ctx.agent,
        tool_name: toolName,
        input,
        output: null,
        status: "failed",
        error_message: msg,
        latency_ms: Date.now() - started,
      });
      return { ok: false, error: msg };
    }
  }

  private async log(row: {
    agent_name: string;
    tool_name: string;
    input: unknown;
    output: unknown;
    status: string;
    error_message?: string | null;
    latency_ms: number;
  }) {
    try {
      await this.db.from("ai_actions").insert({
        agent_name: row.agent_name,
        tool_name: row.tool_name,
        input: (row.input ?? {}) as Record<string, unknown>,
        output: row.output as Record<string, unknown> | null,
        status: row.status,
        error_message: row.error_message ?? null,
        latency_ms: row.latency_ms,
      });
    } catch {
      // ledger write is best-effort; do not break the tool call.
    }
  }
}
