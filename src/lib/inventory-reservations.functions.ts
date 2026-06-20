// Inventory Reservations admin — actions ledger + audit log + idempotent retry.

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
  order_id: z.string().trim().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),
  sort: z.enum(["newest", "oldest_failed"]).default("newest"),
  limit: z.number().int().min(1).max(200).default(100),
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
      .limit(data.limit);
    if (data.status !== "ALL") q = q.eq("execution_status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.order_id) q = q.eq("payload->>order_id", data.order_id);
    if (data.sort === "oldest_failed") {
      q = q.eq("execution_status", "FAILED").order("created_at", { ascending: true });
    } else {
      q = q.order("created_at", { ascending: false });
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: rows ?? [] };
  });

const AuditInput = z.object({
  order_id: z.string().trim().optional(),
  action: z.enum(["ALL", "RESERVE", "RELEASE"]).default("ALL"),
  status: z.enum(["ALL", "OK", "FAILED", "SKIPPED_DUPLICATE", "SHORTAGE"]).default("ALL"),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["newest", "oldest_failed"]).default("newest"),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listInventoryAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AuditInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("inventory_audit_log" as never)
      .select("id, order_id, action, status, reason, actor, payload, created_at")
      .limit(data.limit);
    if (data.action !== "ALL") q = q.eq("action", data.action);
    if (data.status !== "ALL") q = q.eq("status", data.status);
    if (data.order_id) q = q.eq("order_id", data.order_id);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.sort === "oldest_failed") {
      q = q.in("status", ["FAILED", "SHORTAGE"]).order("created_at", { ascending: true });
    } else {
      q = q.order("created_at", { ascending: false });
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows as any[]) ?? [] };
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
    const { data: audit } = await context.supabase
      .from("inventory_audit_log" as never)
      .select("status")
      .gte("created_at", since)
      .limit(5000);
    const auditRows = (audit as any[]) ?? [];
    const auditStats = {
      ok: auditRows.filter((r) => r.status === "OK").length,
      failed: auditRows.filter((r) => r.status === "FAILED").length,
      shortage: auditRows.filter((r) => r.status === "SHORTAGE").length,
      duplicate: auditRows.filter((r) => r.status === "SKIPPED_DUPLICATE").length,
    };

    const { data: low } = await context.supabase
      .from("products")
      .select("id, name, stock_qty, reorder_point")
      .eq("track_stock", true)
      .lte("stock_qty", 5)
      .order("stock_qty", { ascending: true })
      .limit(20);
    return {
      ok: true as const,
      window_days: 7,
      reserved, released, failed,
      shortage_items: shortageItems,
      audit: auditStats,
      low_stock: low ?? [],
    };
  });

const RetryInput = z.object({
  order_id: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
});

export const retryReserveOrderStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RetryInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "reserve_order_stock" as never,
      { _order_id: data.order_id, _actor: context.userId, _reason: data.reason ?? "manual_retry" } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, result };
  });

export const retryReleaseOrderStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RetryInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "release_order_stock" as never,
      { _order_id: data.order_id, _actor: context.userId, _reason: data.reason ?? "manual_release" } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, result };
  });
