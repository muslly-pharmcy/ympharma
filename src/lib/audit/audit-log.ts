// AUDIT-P2-003 — Admin audit log writer.
// Server-only. Use inside privileged server functions after the role check.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditEntry = {
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  result?: "ok" | "denied" | "error";
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgent?: string | null;
};

/**
 * Record an admin action. Fails silently — logging must never break the caller.
 * Uses the user-scoped supabase client so RLS enforces `actor_id = auth.uid()`.
 */
export async function recordAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  entry: AuditEntry,
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      actor_id: userId,
      action: entry.action,
      resource: entry.resource ?? null,
      resource_id: entry.resourceId ?? null,
      result: entry.result ?? "ok",
      metadata: entry.metadata ?? {},
      ip_hash: entry.ipHash ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch {
    /* swallow */
  }
}

/** Read recent audit entries — admin-only via RLS. */
export const listRecentAuditEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(500).default(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, actor_id, actor_email, action, resource, resource_id, result, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
