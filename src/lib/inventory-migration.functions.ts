// Phase 5A — Inventory migration observability (admin read-only).
// No mutation; surfaces shadow-log, readiness, mismatch alerts to admins.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!data) throw new Error("forbidden");
}

export const getInventoryReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("inventory_readiness_report" as never);
    if (error) throw new Error(error.message);
    return data as Record<string, number | string | null | object>;
  });

export const listShadowLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
        onlyMismatches: z.boolean().default(false),
        orderId: z.string().trim().min(1).max(64).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("inventory_shadow_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.onlyMismatches) q = q.eq("would_succeed", false);
    if (data.orderId) q = q.eq("order_id", data.orderId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, limit: data.limit, offset: data.offset };
  });

export const listInventoryMismatchAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z.enum(["open", "resolved", "all"]).default("open"),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("operations_alerts")
      .select("*", { count: "exact" })
      .eq("kind", "INVENTORY_MISMATCH")
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const runReconciliationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Use service-role to invoke the locked-down SECURITY DEFINER function.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("reconcile_inventory_mismatch" as never);
    if (error) throw new Error(error.message);
    return data as { ok: boolean; checked: number; mismatched: number; ran_at: string };
  });

export const getInventoryWriteMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "inventory_write_mode")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      mode: (data?.value as string | null) ?? "legacy_only",
      updated_at: data?.updated_at ?? null,
    };
  });
