import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getActivityLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Forbidden: owner only");

    const limit = data?.limit ?? 200;
    const { data: rows, error } = await context.supabase
      .from("activity_logs")
      .select("id, actor_email, action, entity_type, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      action: z.string().min(1).max(100),
      entityType: z.string().max(50).optional(),
      entityId: z.string().max(100).optional(),
      details: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("log_activity", {
      _action: data.action,
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _details: (data.details ?? {}) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
