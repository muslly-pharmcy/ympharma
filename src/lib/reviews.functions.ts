import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        productId: z.string().uuid(),
        orderId: z.string().optional(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (existing) throw new Error("لقد قمت بتقييم هذا المنتج مسبقاً");

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        product_id: data.productId,
        order_id: data.orderId ?? null,
        rating: data.rating,
        comment: data.comment ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, review };
  });

export const listProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        productId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("product_id", data.productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;

    const avg =
      rows && rows.length > 0
        ? rows.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / rows.length
        : 0;
    return { reviews: rows ?? [], average: Number(avg.toFixed(2)), count: rows?.length ?? 0 };
  });
