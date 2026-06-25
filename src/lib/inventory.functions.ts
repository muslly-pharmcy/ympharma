import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type InventoryRow = {
  id: string;
  legacy_id: number;
  name: string;
  brand: string | null;
  price: number;
  stock_qty: number;
  reorder_point: number;
  expiry_date: string | null;
  supplier_name: string | null;
  supplier_cost: number | null;
  track_stock: boolean;
  is_published: boolean;
};

async function assertAdmin(supabase: any, userId: string) {
  const [adminRes, ownerRes] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  if (!adminRes.data && !ownerRes.data) throw new Error("غير مصرح");
}

const SELECT_COLS =
  "id, legacy_id, name, brand, price, stock_qty, reorder_point, expiry_date, supplier_name, supplier_cost, track_stock, is_published";

// -------- Report (KPIs) --------

export const fetchInventoryReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    // Pull a bounded slice to compute KPIs. For larger catalogs swap to a SQL function.
    const { data, error } = await supabase
      .from("products")
      .select(SELECT_COLS)
      .limit(5000);
    if (error) throw error;

    const rows = (data ?? []) as unknown as InventoryRow[];
    const tracked = rows.filter((r) => r.track_stock);
    const low_stock = tracked.filter((r) => r.stock_qty > 0 && r.stock_qty <= r.reorder_point);
    const out_of_stock = tracked.filter((r) => (r.stock_qty ?? 0) <= 0);

    const now = Date.now();
    const horizon = now + 90 * 24 * 60 * 60 * 1000;
    const near_expiry = rows.filter((r) => {
      if (!r.expiry_date) return false;
      const t = new Date(r.expiry_date).getTime();
      return t >= now && t <= horizon;
    });

    const inventory_value = rows.reduce(
      (sum, r) => sum + (r.stock_qty ?? 0) * Number(r.supplier_cost ?? r.price ?? 0),
      0,
    );

    return { low_stock, out_of_stock, near_expiry, inventory_value };
  });

// -------- List rows --------

export const listInventoryRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        search: z.string().optional(),
        onlyLow: z.boolean().optional(),
        onlyTracked: z.boolean().optional(),
        limit: z.number().int().min(1).max(1000).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase.from("products").select(SELECT_COLS).limit(data.limit);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.onlyTracked) q = q.eq("track_stock", true);

    const { data: rows, error } = await q;
    if (error) throw error;

    let result = (rows ?? []) as unknown as InventoryRow[];
    if (data.onlyLow) {
      result = result.filter((r) => r.track_stock && r.stock_qty <= r.reorder_point);
    }
    return result;
  });

// -------- Update one row --------

export const updateInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        stock_qty: z.number().int().min(0).optional(),
        reorder_point: z.number().int().min(0).optional(),
        expiry_date: z.string().nullable().optional(),
        supplier_name: z.string().nullable().optional(),
        supplier_cost: z.number().nullable().optional(),
        track_stock: z.boolean().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { id, ...patch } = data;
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleaned[k] = v;
    }
    if ("stock_qty" in cleaned) cleaned.last_restocked_at = new Date().toISOString();

    const { error } = await supabase.from("products").update(cleaned).eq("id", id);
    if (error) throw error;
    return { success: true };
  });

// -------- Low-stock convenience for new pages --------

export const getLowStockProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("products")
      .select(SELECT_COLS)
      .eq("track_stock", true)
      .order("stock_qty", { ascending: true })
      .limit(200);
    if (error) throw error;
    const rows = (data ?? []) as unknown as InventoryRow[];
    return { lowStock: rows.filter((r) => r.stock_qty <= r.reorder_point) };
  });

export const updateProductStock = updateInventory;
