// Discount-code management (admin/owner only).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const listDiscountCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("discount_codes")
      .select("id,code,kind,value,min_total,max_uses,uses,first_order_only,starts_at,expires_at,active,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, "حروف وأرقام فقط"),
  kind: z.enum(["percent", "flat", "free_shipping"]),
  value: z.number().min(0).max(1_000_000),
  min_total: z.number().min(0).max(10_000_000).default(0),
  max_uses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  first_order_only: z.boolean().default(false),
  starts_at: z.string().optional(),
  expires_at: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.kind === "percent" && data.value > 100) throw new Error("النسبة لا تتجاوز 100");
    const payload: any = {
      code: data.code.toUpperCase(),
      kind: data.kind,
      value: data.value,
      min_total: data.min_total ?? 0,
      max_uses: data.max_uses ?? null,
      first_order_only: data.first_order_only,
      starts_at: data.starts_at ?? new Date().toISOString(),
      expires_at: data.expires_at ?? null,
      active: data.active,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("discount_codes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, updated: true };
    }
    const { data: row, error } = await context.supabase.from("discount_codes").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_activity", {
      _action: "discount.created", _entity_type: "discount_code", _entity_id: (row as any).id,
      _details: { code: payload.code, kind: payload.kind, value: payload.value } as never,
    });
    return { id: (row as any).id, created: true };
  });

export const deleteDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("discount_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const discountRedemptionReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("discount_redemptions")
      .select("id,code_id,order_id,customer_phone,amount_off,redeemed_at,discount_codes(code,kind,value)")
      .order("redeemed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
