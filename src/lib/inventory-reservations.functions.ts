// Inventory Reservations admin — view & retry RESERVE_STOCK / RELEASE_STOCK actions.
// Reuses agent_actions ledger written by intercept_new_order and release_order_stock.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

const ListInput = z.object({
  kind: z.enum(["ALL", "RESERVE_STOCK", "RELEASE_STOCK"]).default("ALL"),
  status: z.enum(["ALL", "EXECUTED", "FAILED", "PENDING_APPROVAL"]).default("ALL"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listInventoryReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("agent_actions")
      .select("id, action_type, execution_status, status, priority_level, payload, compiled_arabic_output, error_message, executed_at, created_at")
      .in("action_type", data.kind === "ALL" ? ["RESERVE_STOCK", "RELEASE_STOCK"] : [data.kind])
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "ALL") q = q.eq("execution_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: rows ?? [] };
  });

export const inventoryReservationStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("agent_actions")
      .select("action_type, execution_status, payload")
      .in("action_type", ["RESERVE_STOCK", "RELEASE_STOCK"])
      .gte("created_at", since)
      .limit(2000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ action_type: string; execution_status: string; payload: any }>;
    let reserved = 0, released = 0, failed = 0, shortageItems = 0;
    for (const r of rows) {
      if (r.action_type === "RESERVE_STOCK") {
        if (r.execution_status === "FAILED") failed += 1; else reserved += 1;
        shortageItems += Array.isArray(r.payload?.result?.shortages) ? r.payload.result.shortages.length : 0;
      } else if (r.action_type === "RELEASE_STOCK") {
        released += 1;
      }
    }
    // Low stock from products
    const { data: low } = await context.supabase
      .from("products")
      .select("id, name, stock_qty, reorder_point")
      .eq("track_stock", true)
      .lte("stock_qty", 5)
      .order("stock_qty", { ascending: true })
      .limit(20);
    return { ok: true as const, window_days: 7, reserved, released, failed, shortage_items: shortageItems, low_stock: low ?? [] };
  });

const RetryInput = z.object({ order_id: z.string().min(1) });

export const retryReserveOrderStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RetryInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("reserve_order_stock" as never, { _order_id: data.order_id } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, result };
  });
