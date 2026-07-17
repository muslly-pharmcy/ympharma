import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIDecision, AIEvent } from "./types";

export class DecisionEngine {
  evaluate(result: unknown): AIDecision {
    return {
      confidence: 0.95,
      action: result,
      timestamp: new Date(),
    };
  }

  /**
   * Persist a decision to public.ai_decisions and return the new row id.
   * Used by the sun-tick worker to centralise the write pattern so
   * memory/neural hooks have a stable decision_id to reference.
   */
  async decideAndPersist(
    sb: SupabaseClient,
    args: {
      event: AIEvent & { id: string };
      agentName: string;
      startedAt: number;
      result: { type?: string; confidence?: number; result?: unknown };
    },
  ): Promise<string | null> {
    const { data, error } = await sb
      .from("ai_decisions")
      .insert({
        event_id: args.event.id,
        agent_name: args.agentName,
        decision_type: args.result?.type ?? "generic",
        reasoning: {
          latency_ms: Date.now() - args.startedAt,
          source: args.event.source,
        },
        action: (args.result?.result ?? args.result) as never,
        confidence: args.result?.confidence ?? 0.5,
      })
      .select("id")
      .single();
    if (error) return null;
    return (data?.id as string) ?? null;
  }
}
