// In-app notifications — user-scoped server functions.
// All reads/updates run as the authenticated user; RLS scopes rows to user_id.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  read_at: string | null;
  metadata: unknown;
  created_at: string;
};

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).optional(),
        unreadOnly: z.boolean().optional(),
      })
      .partial()
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.unreadOnly) q = q.eq("read", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { notifications: (rows ?? []) as NotificationRow[] };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() } as never)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
