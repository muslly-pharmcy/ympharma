// Inventory Intelligence — server functions (admin-only).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = ctx.supabase as any;
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supa.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    supa.rpc("has_role", { _user_id: ctx.userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("Forbidden");
}

const ListInput = z.object({ limit: z.number().int().min(1).max(200).default(50) });

export const listHealthScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("inventory_health_scores")
      .select(
        "product_id, score, status, availability_pct, velocity_daily, expiry_risk, days_of_cover, current_qty, recommendation, computed_at, products!inner(name, category, price)",
      )
      .order("score", { ascending: true })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const listOpenRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("purchase_recommendations")
      .select(
        "id, product_id, recommended_qty, reason, urgency, expected_stockout_at, status, created_at, products!inner(name, category)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return rows ?? [];
  });

export const intelligenceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("inventory_health_scores")
      .select("status");
    const totals = { healthy: 0, warning: 0, critical: 0, dead: 0 };
    for (const r of (rows ?? []) as Array<{ status: keyof typeof totals }>) {
      totals[r.status] = (totals[r.status] ?? 0) + 1;
    }
    const { count: openRecs } = await context.supabase
      .from("purchase_recommendations")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    return { totals, openRecs: openRecs ?? 0 };
  });

export const recomputeNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("inv_intel_snapshot" as never);
    if (error) throw new Error(error.message);
    return (data as Array<{ products_scored: number; recommendations_created: number }>)?.[0] ?? {
      products_scored: 0,
      recommendations_created: 0,
    };
  });
