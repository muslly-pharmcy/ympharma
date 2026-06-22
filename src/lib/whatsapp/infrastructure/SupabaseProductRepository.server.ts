// Infrastructure — Supabase implementation of IProductRepository (server-only).
import { Product } from "../domain/Product";
import type { IProductRepository } from "../application/ports";
import { ApplicationError } from "../shared/errors";

export class SupabaseProductRepository implements IProductRepository {
  async searchByName(query: string, limit: number): Promise<Product[]> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_qty, price_yer")
      .ilike("name", `%${query}%`)
      .order("stock_qty", { ascending: false })
      .limit(limit);
    if (error) throw new ApplicationError("product_search_failed", "infra_error", error);
    return (data ?? []).map((p) =>
      Product.create({
        id: p.id as string,
        name: p.name as string,
        price: Number(p.price_yer ?? 0),
        stock: Number(p.stock_qty ?? 0),
      }),
    );
  }

  async findMostAvailable(limit: number): Promise<Product[]> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_qty, price_yer")
      .order("stock_qty", { ascending: false })
      .limit(limit);
    if (error) throw new ApplicationError("most_available_failed", "infra_error", error);
    return (data ?? []).map((p) =>
      Product.create({
        id: p.id as string,
        name: p.name as string,
        price: Number(p.price_yer ?? 0),
        stock: Number(p.stock_qty ?? 0),
      }),
    );
  }
}
