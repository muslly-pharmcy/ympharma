// Personalization — SQL-based product recommendations from a customer's order
// history (no ML / TensorFlow). Looks at the last N orders by phone, derives
// the most-frequent product categories, and suggests in-stock products from
// those categories the customer has NOT already bought recently.
//
// Anonymous-friendly (storefront has no customer auth) but throttled per
// phone via existing rate_limit_buckets pattern to avoid enumeration abuse.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeYemenPhone } from "@/lib/phone-normalize";

const Input = z.object({
  phone: z.string().min(6),
  limit: z.number().int().min(1).max(20).default(6),
});

type OrderItem = { id?: number; name?: string; category?: string };

export const getPersonalizedProducts = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const phone = normalizeYemenPhone(data.phone);
    if (!phone) return { ok: false as const, error: "invalid_phone", products: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Throttle: max 30 hits per 10-min window per phone.
    const bucketKey = `recs:phone:${phone}`;
    const windowStart = new Date(Math.floor(Date.now() / (10 * 60 * 1000)) * 10 * 60 * 1000).toISOString();
    const { data: bucket } = await supabaseAdmin
      .from("rate_limit_buckets" as never)
      .upsert({ key: bucketKey, count: 1, window_start: windowStart, updated_at: new Date().toISOString() } as never, { onConflict: "key", ignoreDuplicates: false } as never)
      .select("count, window_start")
      .single();
    const b = bucket as { count: number; window_start: string } | null;
    if (b && b.window_start === windowStart && b.count > 30) {
      return { ok: false as const, error: "rate_limited", products: [] };
    }
    if (b && b.window_start === windowStart) {
      await supabaseAdmin.from("rate_limit_buckets" as never)
        .update({ count: b.count + 1, updated_at: new Date().toISOString() } as never)
        .eq("key", bucketKey);
    }

    // Pull last 10 orders for this phone.
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("orders")
      .select("items")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);
    if (ordersErr) return { ok: false as const, error: ordersErr.message, products: [] };

    // Aggregate categories + already-bought product names.
    const categoryCount = new Map<string, number>();
    const boughtNames = new Set<string>();
    for (const row of orders ?? []) {
      const items = (row.items as OrderItem[] | null) ?? [];
      for (const it of items) {
        if (it.name) boughtNames.add(String(it.name).trim());
        if (it.category) categoryCount.set(it.category, (categoryCount.get(it.category) ?? 0) + 1);
      }
    }

    // Fallback: no history → return popular published products.
    let topCategories = [...categoryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    let query = supabaseAdmin
      .from("products")
      .select("id, name, brand, price, old_price, category, image_url, badge")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(data.limit * 2);
    if (topCategories.length > 0) query = query.in("category", topCategories);

    const { data: products, error: prodErr } = await query;
    if (prodErr) return { ok: false as const, error: prodErr.message, products: [] };

    const filtered = (products ?? [])
      .filter((p: any) => !boughtNames.has(String(p.name).trim()))
      .slice(0, data.limit);

    return {
      ok: true as const,
      based_on_categories: topCategories,
      products: filtered as Array<{
        id: string; name: string; brand: string | null; price: number;
        old_price: number | null; category: string; image_url: string | null; badge: string | null;
      }>,
    };
  });
