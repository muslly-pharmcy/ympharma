/**
 * PhoenixBridge — server-only.
 *
 * Translates unprocessed rows from the Phoenix `agent_events` log into
 * AI Sun events on `ai_events`. Real column mapping:
 *   agent_events.event_name       → ai_events.event_type
 *   agent_events.source           → ai_events.source (fallback "phoenix")
 *   agent_events.payload + entity → ai_events.payload
 *
 * After enqueue we mark the source row `processed_at = now(), processed_by`.
 * Uses supabaseAdmin because agent_events RLS is admin-only and this runs
 * from a cron-authenticated server route.
 */

const BRIDGE_MARK = "sun-bridge";

export interface BridgeResult {
  bridged: number;
  failed: number;
  errors: string[];
}

export async function drainPhoenixEvents(limit = 50): Promise<BridgeResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("agent_events")
    .select("id, event_name, source, payload, entity_type, entity_id, correlation_id")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { bridged: 0, failed: 0, errors: [`fetch: ${error.message}`] };
  }
  if (!rows || rows.length === 0) return { bridged: 0, failed: 0, errors: [] };

  let bridged = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const payload = {
      ...((row.payload as Record<string, unknown>) ?? {}),
      _phoenix: {
        agent_event_id: row.id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        correlation_id: row.correlation_id,
      },
    };

    const { error: insErr } = await supabaseAdmin.from("ai_events").insert({
      event_type: row.event_name,
      source: row.source ?? "phoenix",
      payload,
      priority: "normal",
      status: "pending",
    });

    if (insErr) {
      failed += 1;
      errors.push(`enqueue ${row.id}: ${insErr.message}`);
      continue;
    }

    const { error: markErr } = await supabaseAdmin
      .from("agent_events")
      .update({ processed_at: new Date().toISOString(), processed_by: BRIDGE_MARK })
      .eq("id", row.id);

    if (markErr) {
      failed += 1;
      errors.push(`mark ${row.id}: ${markErr.message}`);
      continue;
    }

    bridged += 1;
  }

  return { bridged, failed, errors };
}

/**
 * Bridge lag: how many agent_events rows are still unprocessed.
 * Read-only, safe to call from admin dashboard server fns.
 */
export async function getBridgeLag(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("agent_events")
    .select("id", { count: "exact", head: true })
    .is("processed_at", null);
  if (error) return 0;
  return count ?? 0;
}
