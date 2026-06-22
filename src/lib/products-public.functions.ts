import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Default page size — bounds payload to roughly one viewport worth of cards.
const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 500;

export const listPublicProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        cursor: z.string().optional(), // ISO timestamp from previous page's last created_at
        sort: z.enum(["newest", "stock_desc", "supplier_asc", "price_asc", "price_desc"]).optional(),
      })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const limit = data?.limit ?? DEFAULT_LIMIT;
    const sort = data?.sort ?? "newest";
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    let q = sb
      .from("products")
      .select("id,legacy_id,name,brand,price,old_price,category,image_url,badge,description,is_published,created_at,stock_qty,supplier_name,track_stock")
      .eq("is_published", true)
      // Hide out-of-stock items but only when stock is tracked.
      .or("track_stock.eq.false,stock_qty.gt.0");
    if (sort === "stock_desc") q = q.order("stock_qty", { ascending: false, nullsFirst: false });
    else if (sort === "supplier_asc") q = q.order("supplier_name", { ascending: true, nullsFirst: false });
    else if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    q = q.limit(limit);
    // Cursor pagination only makes sense for the default (newest) sort.
    if (sort === "newest" && data?.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) return { items: [], nextCursor: null as string | null };
    const items = rows ?? [];
    const nextCursor = sort === "newest" && items.length === limit ? (items[items.length - 1] as any).created_at as string : null;
    return { items, nextCursor };
  });
