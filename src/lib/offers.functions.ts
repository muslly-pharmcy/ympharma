import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertPricing(supabase: any, userId: string) {
  const [{ data: owner }, { data: perms }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle(),
    supabase.from("staff_permissions").select("permission").eq("user_id", userId),
  ]);
  if (owner) return;
  const list = ((perms ?? []) as { permission: string }[]).map((p) => p.permission);
  if (!list.includes("pricing")) throw new Error("ليست لديك صلاحية إدارة الأسعار/العروض");
}

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  product_id: z.string().uuid().optional().nullable(),
});

export const listOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPricing(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("offers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => offerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPricing(context.supabase, context.userId);
    const payload = {
      title: data.title, description: data.description ?? null,
      discount_percent: data.discount_percent ?? null,
      starts_at: data.starts_at || null, ends_at: data.ends_at || null,
      is_active: data.is_active ?? true,
      product_id: data.product_id ?? null,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("offers").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("offers").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPricing(context.supabase, context.userId);
    const { error } = await context.supabase.from("offers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
