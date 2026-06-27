// ============================================================
// DLQService — قراءة وإغلاق صفوف agent_events_dlq
// ============================================================
// • طبقة Repository نظيفة: لا server-fn هنا، لا zod، لا context.
// • يستقبل أي عميل supabase (admin أو user-scoped) ليبقى قابلًا لإعادة
//   الاستخدام من server fns كما من routes.

type SupabaseLike = {
  from: (table: string) => any;
};

export type DlqStatus = "UNRESOLVED" | "RESOLVED" | "ALL";

export interface DlqRow {
  id: string;
  original_id: string;
  event_name: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: unknown;
  source: string | null;
  occurred_at: string;
  retry_count: number;
  last_error: string | null;
  failed_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export class DLQService {
  constructor(private supabase: SupabaseLike) {}

  async list(opts: { status?: DlqStatus; limit?: number } = {}): Promise<DlqRow[]> {
    const status = opts.status ?? "UNRESOLVED";
    const limit = opts.limit ?? 100;
    let q = this.supabase
      .from("agent_events_dlq")
      .select(
        "id, original_id, event_name, entity_type, entity_id, payload, source, occurred_at, retry_count, last_error, failed_at, resolved_at, resolution_note",
      )
      .order("failed_at", { ascending: false })
      .limit(limit);
    if (status === "UNRESOLVED") q = q.is("resolved_at", null);
    if (status === "RESOLVED") q = q.not("resolved_at", "is", null);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as DlqRow[];
  }

  async resolve(id: string, resolvedBy: string, note?: string): Promise<void> {
    const { error } = await this.supabase
      .from("agent_events_dlq")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_note: note ?? `manually resolved by ${resolvedBy}`,
      })
      .eq("id", id)
      .is("resolved_at", null);
    if (error) throw new Error(error.message);
  }
}
