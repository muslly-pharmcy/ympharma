// Phase 2 — AI Events observability mirror.
// After the event-consumer terminates an agent_events row, we insert a
// read-only mirror row into `ai_events` so the AI dashboards can observe
// the production event stream without changing routing.
//
// The mirror is inserted at TERMINAL status (`completed` | `failed`) so the
// sun-tick worker (which only reads `status='pending'`) never re-executes
// it. `source_event_id` is unique per agent_events row: retries update the
// same mirror instead of duplicating.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export interface MirrorInput {
  agentEventId: string;
  eventType: string;
  source: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  correlationId?: string | null;
  outcome: "completed" | "failed";
  note: string;
  targetAgent?: string | null;
  errorMessage?: string | null;
}

export async function mirrorTerminalEvent(
  admin: Admin,
  input: MirrorInput,
): Promise<void> {
  try {
    const payload = {
      ...(input.payload ?? {}),
      _mirror: {
        agent_event_id: input.agentEventId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        note: input.note,
      },
    };
    await admin
      .from("ai_events")
      .upsert(
        {
          event_type: input.eventType,
          source: input.source ?? "event-consumer",
          payload,
          priority: "normal",
          status: input.outcome,
          target_agent: input.targetAgent ?? null,
          error_message: input.errorMessage ?? null,
          correlation_id: input.correlationId ?? null,
          source_event_id: input.agentEventId,
          processed_at: new Date().toISOString(),
        },
        { onConflict: "source_event_id" },
      );
  } catch (err) {
    // Observability must never break routing.
    console.error("[ai-events-mirror] insert failed", err);
  }
}
