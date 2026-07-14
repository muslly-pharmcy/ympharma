// ============================================================
// Event DLQ sink — server-only insert into agent_events_dlq
// ============================================================
import type { EventEnvelope } from "./types";

export async function sendToDLQ(
  envelope: EventEnvelope,
  handlerName: string,
  errorMessage: string,
  attempts: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("agent_events_dlq").insert({
    original_id: envelope.id,
    event_name: envelope.name,
    entity_type: null,
    entity_id: envelope.orgId,
    payload: envelope.payload as never,
    source: `event-bus:${handlerName}`,
    occurred_at: envelope.occurredAt,
    retry_count: attempts,
    last_error: errorMessage.slice(0, 2000),
    failed_at: new Date().toISOString(),
  });
}
