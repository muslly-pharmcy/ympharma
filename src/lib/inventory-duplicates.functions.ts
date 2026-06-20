// Server functions for the "duplicate products" admin tab and the
// "bulk +N preview/apply" workflow. All require owner/admin access.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!data) throw new Error("صلاحية الأدمن مطلوبة");
}

function normalizeName(n: string): string {
  return (n ?? "")
    .toLowerCase()
    .replace(/[\u200f\u200e]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type DuplicateGroup = {
  key: string;
  display_name: string;
  count: number;
  total_stock: number;
  items: Array<{
    id: string;
    legacy_id: number | null;
    name: string;
    brand: string | null;
    price: number;
    stock_qty: number;
    supplier_name: string | null;
    supplier_cost: number | null;
    is_published: boolean;
  }>;
};

export const listDuplicateProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("id,legacy_id,name,brand,price,stock_qty,supplier_name,supplier_cost,is_published")
      .order("name", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);

    const groups = new Map<string, DuplicateGroup>();
    for (const r of (data ?? []) as any[]) {
      const key = normalizeName(r.name);
      if (!key) continue;
      let g = groups.get(key);
      if (!g) {
        g = { key, display_name: r.name, count: 0, total_stock: 0, items: [] };
        groups.set(key, g);
      }
      g.count++;
      g.total_stock += Number(r.stock_qty ?? 0);
      g.items.push(r);
    }
    return Array.from(groups.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => b.count - a.count || b.total_stock - a.total_stock);
  });

// Set a unified supplier on a set of product ids (merge-by-supplier helper).
export const unifySupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      supplier_name: z.string().trim().min(1).max(160),
      supplier_cost: z.number().min(0).max(10_000_000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = { supplier_name: data.supplier_name };
    if (data.supplier_cost !== undefined) patch.supplier_cost = data.supplier_cost;
    const { error, count } = await context.supabase
      .from("products")
      .update(patch as never, { count: "exact" })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_activity", {
      _action: "inventory.unify_supplier",
      _details: { count: count ?? data.ids.length, supplier: data.supplier_name } as never,
    });
    return { updated: count ?? data.ids.length };
  });

// ---------- Bulk stock add (preview + apply) ----------

const scopeSchema = z.enum(["published", "tracked", "out_of_stock"]);

async function fetchScope(supabase: any, scope: z.infer<typeof scopeSchema>) {
  let q = supabase
    .from("products")
    .select("id,legacy_id,name,brand,stock_qty,track_stock,is_published")
    .order("name", { ascending: true })
    .limit(5000);
  if (scope === "published") q = q.eq("is_published", true);
  if (scope === "tracked") q = q.eq("track_stock", true);
  if (scope === "out_of_stock") q = q.lte("stock_qty", 0);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string; legacy_id: number | null; name: string; brand: string | null;
    stock_qty: number; track_stock: boolean; is_published: boolean;
  }>;
}

export const previewBulkAddStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      delta: z.number().int().min(-1000).max(1000),
      scope: scopeSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = await fetchScope(context.supabase, data.scope);
    return {
      delta: data.delta,
      scope: data.scope,
      count: rows.length,
      total_before: rows.reduce((s, r) => s + (r.stock_qty ?? 0), 0),
      total_after: rows.reduce((s, r) => s + Math.max(0, (r.stock_qty ?? 0) + data.delta), 0),
      sample: rows.slice(0, 50).map((r) => ({
        ...r,
        after_qty: Math.max(0, (r.stock_qty ?? 0) + data.delta),
      })),
    };
  });

export const applyBulkAddStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      delta: z.number().int().min(-1000).max(1000),
      scope: scopeSchema,
      reason: z.string().trim().min(3).max(200),
      confirm: z.literal(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = await fetchScope(context.supabase, data.scope);
    // Set audit context so the stock-change trigger picks up the reason/source.
    try {
      await context.supabase.rpc("set_config" as never, {
        key: "app.adjust_reason", value: data.reason, is_local: true,
      } as never);
    } catch { /* optional rpc; trigger still logs with NULL reason */ }

    let applied = 0;
    for (const r of rows) {
      const next = Math.max(0, (r.stock_qty ?? 0) + data.delta);
      const { error } = await context.supabase
        .from("products").update({ stock_qty: next } as never).eq("id", r.id);
      if (!error) applied++;
    }
    await context.supabase.rpc("log_activity", {
      _action: "inventory.bulk_add",
      _details: { applied, count: rows.length, delta: data.delta, scope: data.scope, reason: data.reason } as never,
    });
    return { applied, count: rows.length };
  });
