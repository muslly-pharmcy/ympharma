import { supabase } from "@/integrations/supabase/client";
import type { AIEvent } from "./types";

/**
 * EventBus — persists AI events into `ai_events` and reads the pending queue.
 * Uses the browser-safe Supabase client (RLS admin-only for reads).
 */
export class EventBus {
  async publish(event: AIEvent) {
    const { data, error } = await supabase
      .from("ai_events" as never)
      .insert({
        event_type: event.event_type,
        source: event.source,
        payload: event.payload as never,
        priority: event.priority ?? "normal",
        target_agent: event.target_agent ?? null,
      } as never)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getPending() {
    const { data, error } = await supabase
      .from("ai_events" as never)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Array<AIEvent & { id: string }>;
  }
}
