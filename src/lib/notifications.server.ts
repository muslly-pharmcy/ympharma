// Server-only helper for creating notifications (uses service role).
// Import inside server function handlers, not at module scope of route files.
import type { Json } from "@/integrations/supabase/types";

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  metadata?: Json;
};

export async function createNotification(input: CreateNotificationInput): Promise<{ id: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      priority: input.priority ?? "medium",
      metadata: (input.metadata ?? {}) as never,
    } as never)
    .select("id")
    .single();
  if (error) {
    console.error("[notifications] create failed", error.message);
    return { id: null };
  }
  return { id: (data as { id: string }).id };
}
