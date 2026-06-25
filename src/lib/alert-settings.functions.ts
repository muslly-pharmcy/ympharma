// Admin server functions for alert settings + SMS/WhatsApp subscribers.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const getAlertSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("alert_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

const settingsSchema = z.object({
  uptime_threshold_pct: z.number().int().min(0).max(100),
  growth_threshold_pct: z.number().int().min(-100).max(100),
  overdue_orders_threshold: z.number().int().min(0).max(10000),
  errors_threshold: z.number().int().min(0).max(100000),
  enable_uptime: z.boolean(),
  enable_growth: z.boolean(),
  enable_overdue: z.boolean(),
  enable_errors: z.boolean(),
  enable_slack: z.boolean(),
  enable_sms: z.boolean(),
  enable_whatsapp: z.boolean(),
  enable_email: z.boolean(),
});

export const updateAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("alert_settings")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAlertSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("alert_subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { subscribers: data ?? [] };
  });

export const addAlertSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      label: z.string().min(1).max(80).optional(),
      phone_e164: z.string().regex(/^\+[1-9][0-9]{6,15}$/, "phone must be E.164 (+9665…)"),
      receive_sms: z.boolean().default(true),
      receive_whatsapp: z.boolean().default(true),
      min_severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
      active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("alert_subscribers")
      .insert({ ...data, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAlertSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      receive_sms: z.boolean().optional(),
      receive_whatsapp: z.boolean().optional(),
      min_severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      active: z.boolean().optional(),
      label: z.string().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("alert_subscribers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAlertSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("alert_subscribers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
