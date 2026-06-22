// Dynamic recommendations: personalized, trending, seasonal.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecommendedProduct = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  score: number;
  reason: string;
};

const inputSchema = z
  .object({
    phone: z.string().trim().min(3).max(32).optional(),
    limit: z.number().int().min(1).max(24).optional(),
    mode: z.enum(["auto", "personalized", "trending", "seasonal"]).optional(),
  })
  .partial();

function seasonalKeywords(month: number): string[] {
  if (month >= 10 || month <= 1) return ["فيتامين", "مناعة", "برد", "انفلونزا", "زكام"];
  if (month >= 2 && month <= 4) return ["حساسية", "ربو", "هيستامين"];
  if (month >= 5 && month <= 7) return ["حروق", "شمس", "جروح"];
  if (month === 8) return ["أطفال", "فيتامين", "تركيز", "ذاكرة"];
  return [];
}

export const getDynamicRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => inputSchema.parse(i ?? {}))
  .handler(async ({ data, context }): Promise<{ source: string; items: RecommendedProduct[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 8;
    const mode = data.mode ?? "auto";

    // Personalized — needs caller phone and recent orders
    if ((mode === "auto" || mode === "personalized") && data.phone) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("items")
        .eq("customer_phone", data.phone)
        .order("created_at", { ascending: false })
        .limit(10);

      const purchasedNames = new Set<string>();
      for (const o of (orders ?? []) as Array<{ items: unknown }>) {
        const items = Array.isArray(o.items) ? (o.items as Array<{ name?: string }>) : [];
        for (const it of items) if (it?.name) purchasedNames.add(String(it.name));
      }

      if (purchasedNames.size > 0) {
        const { data: pastProducts } = await supabaseAdmin
          .from("products")
          .select("category")
          .in("name", Array.from(purchasedNames));
        const categories = Array.from(
          new Set(((pastProducts ?? []) as Array<{ category: string | null }>).map((p) => p.category).filter(Boolean) as string[]),
        );
        if (categories.length > 0) {
          const { data: recs } = await supabaseAdmin
            .from("products")
            .select("id,name,price,category,image_url,stock_qty,is_published")
            .in("category", categories)
            .not("name", "in", `(${Array.from(purchasedNames).map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`)
            .eq("is_published", true)
            .gt("stock_qty", 0)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .limit(limit);
          const items: RecommendedProduct[] = ((recs ?? []) as Array<Omit<RecommendedProduct, "score" | "reason">>).map((p) => ({
            ...p,
            score: 5,
            reason: "بناءً على مشترياتك السابقة",
          }));
          if (items.length) return { source: "personalized", items };
        }
      }
    }

    // Seasonal — by current month keywords
    if (mode === "auto" || mode === "seasonal") {
      const kws = seasonalKeywords(new Date().getMonth());
      if (kws.length) {
        const orFilter = kws.map((k) => `name.ilike.%${k}%`).join(",");
        const { data: seas } = await supabaseAdmin
          .from("products")
          .select("id,name,price,category,image_url")
          .or(orFilter)
          .eq("is_published", true)
          .gt("stock_qty", 0)
          .limit(limit);
        const items: RecommendedProduct[] = ((seas ?? []) as Array<Omit<RecommendedProduct, "score" | "reason">>).map((p) => ({
          ...p,
          score: 4,
          reason: "مناسب للموسم الحالي",
        }));
        if (items.length && mode === "seasonal") return { source: "seasonal", items };
        if (items.length) return { source: "seasonal", items };
      }
    }

    // Trending fallback — recent best sellers via RPC
    const { data: top } = await context.supabase.rpc("top_selling_products" as never, {
      _days: 30,
      _limit: limit,
    } as never);
    const names = ((top ?? []) as Array<{ product_name: string }>).map((r) => r.product_name);
    if (names.length === 0) return { source: "trending", items: [] };
    const { data: trending } = await supabaseAdmin
      .from("products")
      .select("id,name,price,category,image_url")
      .in("name", names)
      .eq("is_published", true)
      .limit(limit);
    const items: RecommendedProduct[] = ((trending ?? []) as Array<Omit<RecommendedProduct, "score" | "reason">>).map((p) => ({
      ...p,
      score: 3,
      reason: "من المنتجات الأكثر مبيعاً مؤخراً",
    }));
    return { source: "trending", items };
  });
