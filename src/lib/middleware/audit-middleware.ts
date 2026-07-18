// AUDIT-P2-003 — Convenience wrapper that runs a privileged action and records
// an audit entry regardless of outcome. Server-only.
import { recordAdminAction, type AuditEntry } from "@/lib/audit/audit-log";

export async function withAudit<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  entry: Omit<AuditEntry, "result">,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const value = await fn();
    await recordAdminAction(supabase, userId, { ...entry, result: "ok" });
    return value;
  } catch (err) {
    await recordAdminAction(supabase, userId, {
      ...entry,
      result: "error",
      metadata: {
        ...(entry.metadata ?? {}),
        error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      },
    });
    throw err;
  }
}
