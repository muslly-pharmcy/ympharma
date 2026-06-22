// Admin-only smart recommendations — top-selling products + low-stock alerts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TopProduct = {
  product_name: string;
  units_sold: number;
  revenue_yer: number;
  orders_count: number;
  current_stock: number | null;
  current_price: number | null;
};

export type RecommendationsResult = {
  windowDays: number;
  topProducts: TopProduct[];
  restockAlerts: TopProduct[];
};

export const getPharmacyRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(180).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .partial()
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<RecommendationsResult> => {
    // Admin/owner check (RPC enforces it too, but fail fast here).
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never),
      context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never),
    ]);
    if (!isAdmin && !isOwner) throw new Error("forbidden");

    const days = data.days ?? 30;
    const limit = data.limit ?? 20;

    const { data: rows, error } = await context.supabase.rpc("top_selling_products" as never, {
      _days: days,
      _limit: limit,
    } as never);
    if (error) throw new Error(error.message);

    const topProducts = ((rows ?? []) as TopProduct[]).map((r) => ({
      product_name: r.product_name,
      units_sold: Number(r.units_sold ?? 0),
      revenue_yer: Number(r.revenue_yer ?? 0),
      orders_count: Number(r.orders_count ?? 0),
      current_stock: r.current_stock === null ? null : Number(r.current_stock),
      current_price: r.current_price === null ? null : Number(r.current_price),
    }));

    // Restock alerts: top sellers whose current stock is 0 or <= 5
    const restockAlerts = topProducts.filter(
      (p) => p.current_stock !== null && p.current_stock <= 5,
    );

    return { windowDays: days, topProducts, restockAlerts };
  });
