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
      })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const limit = data?.limit ?? DEFAULT_LIMIT;
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    let q = sb
      .from("products")
      .select("id,legacy_id,name,brand,price,old_price,category,image_url,badge,description,is_published,created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) return { items: [], nextCursor: null as string | null };
    const items = rows ?? [];
    const nextCursor = items.length === limit ? (items[items.length - 1] as any).created_at as string : null;
    return { items, nextCursor };
  });
