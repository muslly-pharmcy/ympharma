// Inventory management server functions.
// Staff-only; uses `requireSupabaseAuth` + role/permission gate.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertInventoryAccess(supabase: any, userId: string) {
  const [{ data: role }, { data: perms }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["owner", "admin"]).maybeSingle(),
    supabase.from("staff_permissions").select("permission").eq("user_id", userId),
  ]);
  if (role) return;
  const list = ((perms ?? []) as { permission: string }[]).map((p) => p.permission);
  if (!list.some((p) => p === "products" || p === "orders")) {
    throw new Error("ليست لديك صلاحية إدارة المخزون");
  }
}

export const fetchInventoryReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertInventoryAccess(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("inventory_report" as never);
    if (error) throw new Error(error.message);
    return data as {
      low_stock: Array<{ legacy_id: number; name: string; stock_qty: number; reorder_point: number; supplier_name: string | null }>;
      near_expiry: Array<{ legacy_id: number; name: string; expiry_date: string; stock_qty: number }>;
      out_of_stock: Array<{ legacy_id: number; name: string }>;
      inventory_value: number;
      checked_at: string;
    };
  });

export const listInventoryRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      search: z.string().trim().max(120).optional(),
      onlyLow: z.boolean().optional(),
      onlyTracked: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertInventoryAccess(context.supabase, context.userId);
    let q = context.supabase
      .from("products")
      .select("id,legacy_id,name,brand,price,stock_qty,reorder_point,expiry_date,supplier_name,supplier_cost,track_stock,is_published")
      .order("name", { ascending: true })
      .limit(data.limit ?? 200);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.onlyTracked) q = q.eq("track_stock", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let out = (rows ?? []) as any[];
    if (data.onlyLow) out = out.filter((r) => r.track_stock && r.stock_qty <= r.reorder_point);
    return out;
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  stock_qty: z.number().int().min(0).max(1_000_000).optional(),
  reorder_point: z.number().int().min(0).max(1_000_000).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  supplier_name: z.string().trim().max(160).nullable().optional(),
  supplier_cost: z.number().min(0).max(10_000_000).nullable().optional(),
  track_stock: z.boolean().optional(),
});

export const updateInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertInventoryAccess(context.supabase, context.userId);
    const patch: Record<string, unknown> = {};
    for (const k of ["stock_qty", "reorder_point", "expiry_date", "supplier_name", "supplier_cost", "track_stock"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_activity", {
      _action: "inventory.updated",
      _entity_type: "product",
      _entity_id: data.id,
      _details: patch as never,
    });
    return { ok: true };
  });

export const bulkAdjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      adjustments: z.array(z.object({
        id: z.string().uuid(),
        delta: z.number().int().min(-100_000).max(100_000),
      })).min(1).max(500),
      reason: z.string().trim().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertInventoryAccess(context.supabase, context.userId);
    let applied = 0;
    for (const a of data.adjustments) {
      const { data: row, error: ge } = await context.supabase
        .from("products").select("stock_qty").eq("id", a.id).maybeSingle();
      if (ge || !row) continue;
      const next = Math.max(0, (row.stock_qty ?? 0) + a.delta);
      const { error } = await context.supabase
        .from("products").update({ stock_qty: next }).eq("id", a.id);
      if (!error) applied++;
    }
    await context.supabase.rpc("log_activity", {
      _action: "inventory.bulk_adjust",
      _details: { applied, count: data.adjustments.length, reason: data.reason ?? null } as never,
    });
    return { applied };
  });
