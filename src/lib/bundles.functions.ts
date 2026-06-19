// Bundle management: public listing and admin CRUD.
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
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId)
    .in("role", ["owner", "admin"]).maybeSingle();
  if (data) return;
  const { data: perm } = await supabase
    .from("staff_permissions").select("permission").eq("user_id", userId).eq("permission", "orders").maybeSingle();
  if (!perm) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const listBundlesPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.rpc("list_bundles_public");
  if (error) throw new Error(error.message);
  return (data as any[]) ?? [];
});

export const adminBundlesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_bundles_report");
    if (error) throw new Error(error.message);
    return (data as any[]) ?? [];
  });

export const listBundlesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("bundles").select("*, bundle_items(id,product_legacy_id,qty)")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  image_url: z.string().trim().url().max(2048).optional().nullable(),
  kind: z.string().trim().max(40).default("general"),
  discount_percent: z.number().min(0).max(90),
  fixed_price: z.number().min(0).max(10_000_000).optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10_000).default(100),
  items: z.array(z.object({
    product_legacy_id: z.number().int().positive(),
    qty: z.number().int().min(1).max(99),
  })).max(20).default([]),
});

export const upsertBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload: any = {
      slug: data.slug, name: data.name, description: data.description ?? null,
      image_url: data.image_url ?? null, kind: data.kind,
      discount_percent: data.discount_percent, fixed_price: data.fixed_price ?? null,
      is_active: data.is_active, sort_order: data.sort_order,
    };
    let id = data.id;
    if (id) {
      const { error } = await context.supabase.from("bundles").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await context.supabase.from("bundles").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      id = (row as any).id;
    }
    // Replace items
    await context.supabase.from("bundle_items").delete().eq("bundle_id", id!);
    if (data.items.length) {
      const rows = data.items.map((i) => ({ bundle_id: id!, product_legacy_id: i.product_legacy_id, qty: i.qty }));
      const { error } = await context.supabase.from("bundle_items").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { id, ok: true };
  });

export const deleteBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("bundles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
