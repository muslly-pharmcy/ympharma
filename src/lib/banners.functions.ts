// Marketing banners: public listing + admin CRUD + event tracking.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role")
    .eq("user_id", userId).in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const listActiveBanners = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ placement: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("marketing_banners")
      .select("id,title,subtitle,cta_label,cta_href,theme,image_url,placement,sort_order")
      .order("sort_order");
    if (data.placement) q = q.eq("placement", data.placement);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listBannersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("marketing_banners")
      .select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(500).optional().nullable(),
  cta_label: z.string().trim().max(60).optional().nullable(),
  cta_href: z.string().trim().max(2048).optional().nullable(),
  theme: z.string().trim().max(40).default("gradient-emerald"),
  image_url: z.string().trim().max(2048).optional().nullable(),
  placement: z.string().trim().max(40).default("home"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10_000).default(100),
  expires_at: z.string().nullable().optional(),
});

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bannerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload: any = { ...data };
    delete payload.id;
    if (data.id) {
      const { error } = await context.supabase.from("marketing_banners").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, ok: true };
    }
    const { data: row, error } = await context.supabase.from("marketing_banners").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id, ok: true };
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("marketing_banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const trackBanner = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    event: z.enum(["impression", "click"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    await sb.rpc("track_banner_event", { _banner_id: data.id, _event: data.event });
    return { ok: true };
  });
