// ============================================================
// DLQReplayEngine — إعادة دفع صفوف DLQ إلى agent_events
// ============================================================
// • يُحمَّل supabaseAdmin بـ dynamic import → آمن للاستيراد من
//   ملفات .functions.ts (لن يُسرَّب إلى bundle العميل).
// • single + bulk replay مع تتبع نتائج كل صف بدقة.

export interface ReplayResult {
  id: string;
  ok: boolean;
  error?: string;
}

export interface BulkReplayResult {
  replayed: number;
  failed: number;
  results: ReplayResult[];
}

export class DLQReplayEngine {
  constructor(private resolvedBy: string) {}

  async replayOne(id: string): Promise<ReplayResult> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("agent_events_dlq")
      .select("*")
      .eq("id", id)
      .is("resolved_at", null)
      .maybeSingle();
    if (error) return { id, ok: false, error: error.message };
    if (!row) return { id, ok: false, error: "not_found_or_resolved" };

    const { error: insErr } = await supabaseAdmin.from("agent_events").insert({
      event_name: row.event_name,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      payload: row.payload,
      source: `dlq-replay:${row.source ?? "system"}`,
      occurred_at: new Date().toISOString(),
      retry_count: 0,
      correlation_id: (row as { correlation_id?: string | null }).correlation_id ?? null,
    } as never);
    if (insErr) return { id, ok: false, error: insErr.message };

    const { error: updErr } = await supabaseAdmin
      .from("agent_events_dlq")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: this.resolvedBy,
        resolution_note: `replayed by admin ${this.resolvedBy}`,
      })
      .eq("id", id);
    if (updErr) return { id, ok: false, error: updErr.message };

    return { id, ok: true };
  }

  async replayBulk(limit = 10): Promise<BulkReplayResult> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("agent_events_dlq")
      .select("id")
      .is("resolved_at", null)
      .order("failed_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    const results: ReplayResult[] = [];
    for (const r of rows ?? []) results.push(await this.replayOne(r.id));
    const replayed = results.filter((r) => r.ok).length;
    return { replayed, failed: results.length - replayed, results };
  }
}
