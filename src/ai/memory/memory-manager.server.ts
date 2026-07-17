/**
 * MemoryManager — server-only.
 *
 * Writes experience/knowledge rows for AI agents into public.ai_memory.
 * Only ever imported from server function handlers or server routes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryType = "short" | "long" | "experience" | "knowledge";

export interface RememberInput {
  agent: string;
  type: MemoryType;
  context: Record<string, unknown>;
  importance?: number;
  expiresAt?: Date | null;
}

export interface RecallOptions {
  limit?: number;
  minImportance?: number;
}

export class MemoryManager {
  constructor(private readonly sb: SupabaseClient) {}

  async remember(input: RememberInput) {
    const importance = clamp01(input.importance ?? 0.5);
    const { data, error } = await this.sb
      .from("ai_memory")
      .insert({
        agent_name: input.agent,
        memory_type: input.type,
        context: input.context,
        importance,
        expires_at: input.expiresAt?.toISOString() ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`memory.remember failed: ${error.message}`);
    return data;
  }

  async recall(agent: string, options: RecallOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 200);
    const minImportance = clamp01(options.minImportance ?? 0);

    const { data, error } = await this.sb
      .from("ai_memory")
      .select("id, agent_name, memory_type, context, importance, created_at, expires_at")
      .eq("agent_name", agent)
      .gte("importance", minImportance)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`memory.recall failed: ${error.message}`);
    return data ?? [];
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
