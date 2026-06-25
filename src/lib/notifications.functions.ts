import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  read_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

const NotificationTypes = z.enum([
  "prescription_approved",
  "prescription_rejected",
  "refill_reminder",
  "order_confirmed",
  "system_alert",
]);

const Priority = z.enum(["low", "medium", "high", "urgent"]);

// -------- Read APIs --------

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return { notifications: (rows ?? []) as unknown as NotificationRow[] };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw error;
    return { count: count ?? 0 };
  });

// Alias kept for the NotificationBell component (different surface).
export const getUserNotifications = listMyNotifications;

// -------- Mark read APIs --------

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw error;
    return { success: true };
  });

// -------- Send (admin/owner only) --------

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(500),
        type: NotificationTypes,
        priority: Priority.default("medium"),
        metadata: z.record(z.string(), z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId: actorId } = context;
    const [adminRes, ownerRes] = await Promise.all([
      supabase.rpc("has_role", { _user_id: actorId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: actorId, _role: "owner" }),
    ]);
    if (!adminRes.data && !ownerRes.data) {
      throw new Error("غير مصرح: تحتاج صلاحية مدير");
    }

    const { data: notif, error } = await supabase
      .from("notifications")
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        priority: data.priority,
        metadata: (data.metadata ?? {}) as any,
      })
      .select()
      .single();
    if (error) throw error;

    // TODO: dispatch via FCM once FCM_SERVER_KEY is provisioned.
    const { data: devices } = await supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", data.userId)
      .eq("active", true);

    return {
      success: true,
      notificationId: notif?.id,
      deviceCount: devices?.length ?? 0,
    };
  });

// -------- Device registration --------

export const registerUserDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fcmToken: z.string().min(10),
        deviceName: z.string().max(120).optional(),
        platform: z.enum(["web", "ios", "android"]).default("web"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_devices" as any)
      .upsert(
        {
          user_id: userId,
          fcm_token: data.fcmToken,
          device_name: data.deviceName ?? null,
          platform: data.platform,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fcm_token" },
      );
    if (error) throw error;
    return { success: true };
  });
