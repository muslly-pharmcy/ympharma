// Telemetry Cleanup — Phase 3 (P3-GATE-03).
// Deletes expired rows from agent_decisions + agent_feedback_events via the
// SECURITY DEFINER `clean_old_telemetry()` SQL function. Aggregated insights
// in `agent_performance_insights` are NEVER deleted — they are permanent.
//
// Server-only. Non-blocking.
export interface CleanupResult {
  ok: boolean;
  deleted_decisions?: number;
  deleted_feedback?: number;
  reason?: string;
}

export async function cleanTelemetry(): Promise<CleanupResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("clean_old_telemetry" as any);
    if (error) return { ok: false, reason: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: true,
      deleted_decisions: Number(row?.deleted_decisions ?? 0),
      deleted_feedback: Number(row?.deleted_feedback ?? 0),
    };
  } catch (e) {
    console.error("[telemetry.cleanup]", (e as Error).message);
    return { ok: false, reason: (e as Error).message };
  }
}
