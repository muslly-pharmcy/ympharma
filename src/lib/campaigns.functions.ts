// Chronic-medication campaign management.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role")
    .eq("user_id", userId).in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("campaign_report");
    if (error) throw new Error(error.message);
    return (data as any[]) ?? [];
  });

const schema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  condition_tag: z.string().trim().max(40).optional().nullable(),
  discount_code: z.string().trim().max(40).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload: any = { ...data }; delete payload.id;
    if (data.id) {
      const { error } = await context.supabase.from("campaigns").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, ok: true };
    }
    const { data: row, error } = await context.supabase.from("campaigns").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id, ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fetchRevenueSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(7).max(90).default(14) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("admin_revenue_series", { _days: data.days });
    if (error) throw new Error(error.message);
    return res as any;
  });
