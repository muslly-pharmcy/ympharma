// Admin-only inventory sync from parsed Excel rows.
// Supports chunked execution so the UI can render a real progress bar
// (call runInventorySync per chunk with skipHide=true, then finalize
// once with finalizeInventoryHide using the union of all seen legacy ids).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RowSchema = z.object({
  legacyId: z.number().int().positive(),
  name: z.string().min(1),
  supplier: z.string().optional().nullable(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  price: z.number().min(0).default(0),
  category: z.string().optional().nullable(),
});

export type SyncReport = {
  total: number;
  updated: number;
  inserted: number;
  republished: number;
  hidden: number;
  errors: { legacyId: number; message: string }[];
  updatedIds?: number[];
  insertedIds?: number[];
  hiddenIds?: string[];
};

async function assertAdminOrOwner(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  if (!isAdmin && !isOwner) throw new Error("Forbidden");
}

async function notifyAdmins(
  supabaseAdmin: any,
  payload: { title: string; body: string; priority: "high" | "urgent"; metadata: Record<string, unknown> },
) {
  try {
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "owner"]);
    const userIds = Array.from(new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id)));
    if (userIds.length === 0) return;
    const inserts = userIds.map((uid) => ({
      user_id: uid,
      type: "inventory_sync_failure",
      title: payload.title,
      body: payload.body,
      priority: payload.priority,
      metadata: payload.metadata,
    }));
    await supabaseAdmin.from("notifications").insert(inserts as never);
  } catch {
    /* notifications optional */
  }
}

export const runInventorySync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      rows: z.array(RowSchema).min(1).max(5000),
      skipHide: z.boolean().optional().default(false),
      logActivity: z.boolean().optional().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<SyncReport> => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const legacyIds = data.rows.map((r) => r.legacyId);
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("products")
      .select("id, legacy_id, is_published")
      .in("legacy_id", legacyIds);
    if (fetchErr) throw fetchErr;

    const byLegacy = new Map<number, { id: string; is_published: boolean }>();
    for (const p of existing ?? []) {
      if (typeof p.legacy_id === "number") byLegacy.set(p.legacy_id, { id: p.id, is_published: !!p.is_published });
    }

    const report: SyncReport = {
      total: data.rows.length,
      updated: 0, inserted: 0, republished: 0, hidden: 0,
      errors: [], updatedIds: [], insertedIds: [], hiddenIds: [],
    };
    const nowIso = new Date().toISOString();

    for (const row of data.rows) {
      const shouldPublish = row.stock > 0;
      const payload = {
        name: row.name,
        supplier_name: row.supplier || null,
        expiry_date: row.expiry || null,
        stock_qty: row.stock,
        price: row.price,
        track_stock: true,
        is_published: shouldPublish,
        updated_at: nowIso,
      };
      const found = byLegacy.get(row.legacyId);
      if (found) {
        const { error } = await supabaseAdmin.from("products").update(payload).eq("id", found.id);
        if (error) { report.errors.push({ legacyId: row.legacyId, message: error.message }); continue; }
        report.updated++;
        report.updatedIds!.push(row.legacyId);
        if (shouldPublish && !found.is_published) report.republished++;
      } else {
        const { error } = await supabaseAdmin.from("products").insert({
          ...payload,
          legacy_id: row.legacyId,
          category: row.category || "أدوية",
          created_at: nowIso,
        });
        if (error) { report.errors.push({ legacyId: row.legacyId, message: error.message }); continue; }
        report.inserted++;
        report.insertedIds!.push(row.legacyId);
      }
    }

    if (!data.skipHide) {
      const seen = new Set(legacyIds);
      const { data: allPublished } = await supabaseAdmin
        .from("products")
        .select("id, legacy_id")
        .eq("is_published", true)
        .not("legacy_id", "is", null);
      const toHide = (allPublished ?? [])
        .filter((p) => typeof p.legacy_id === "number" && !seen.has(p.legacy_id))
        .map((p) => p.id);
      for (let i = 0; i < toHide.length; i += 500) {
        const slice = toHide.slice(i, i + 500);
        const { error } = await supabaseAdmin
          .from("products")
          .update({ is_published: false, updated_at: nowIso })
          .in("id", slice);
        if (!error) {
          report.hidden += slice.length;
          report.hiddenIds!.push(...slice);
        }
      }
    }

    if (data.logActivity) {
      try {
        await supabaseAdmin.from("activity_logs").insert({
          actor_id: context.userId,
          action: "inventory_sync",
          entity_type: "products",
          details: { ...report, chunk: true, skipHide: data.skipHide } as unknown as Record<string, unknown>,
        } as never);
      } catch { /* logging optional */ }
    }

    return report;
  });

// Hide all currently-published products whose legacy_id is NOT in the union
// of legacy ids seen across all chunks of a single upload session.
export const finalizeInventoryHide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      seenLegacyIds: z.array(z.number().int().positive()).min(1),
      aggregateReport: z.object({
        total: z.number(),
        updated: z.number(),
        inserted: z.number(),
        republished: z.number(),
        errorCount: z.number(),
      }).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ hidden: number; hiddenIds: string[] }> => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const seen = new Set(data.seenLegacyIds);
    const nowIso = new Date().toISOString();
    const { data: allPublished, error } = await supabaseAdmin
      .from("products")
      .select("id, legacy_id")
      .eq("is_published", true)
      .not("legacy_id", "is", null);
    if (error) throw error;
    const toHide = (allPublished ?? [])
      .filter((p) => typeof p.legacy_id === "number" && !seen.has(p.legacy_id))
      .map((p) => p.id);
    let hidden = 0;
    const hiddenIds: string[] = [];
    for (let i = 0; i < toHide.length; i += 500) {
      const slice = toHide.slice(i, i + 500);
      const { error: e2 } = await supabaseAdmin
        .from("products")
        .update({ is_published: false, updated_at: nowIso })
        .in("id", slice);
      if (!e2) { hidden += slice.length; hiddenIds.push(...slice); }
    }
    try {
      await supabaseAdmin.from("activity_logs").insert({
        actor_id: context.userId,
        action: "inventory_sync_finalize",
        entity_type: "products",
        details: { hidden, hiddenIds, ...(data.aggregateReport ?? {}) } as unknown as Record<string, unknown>,
      } as never);
    } catch { /* optional */ }
    return { hidden, hiddenIds };
  });

// Pre/post sync product counts for parity checking.
export const getProductCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [total, published, withStock] = await Promise.all([
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("is_published", true),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).gt("stock_qty", 0),
    ]);
    return {
      total: total.count ?? 0,
      published: published.count ?? 0,
      withStock: withStock.count ?? 0,
    };
  });

// Persist a full sync run to inventory_sync_logs (one row per upload).
// On failure also notifies admins via notifications table.
export const recordSyncRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.enum(["completed", "failed", "cancelled"]),
      total: z.number().int().min(0),
      updated: z.number().int().min(0),
      inserted: z.number().int().min(0),
      republished: z.number().int().min(0),
      hidden: z.number().int().min(0),
      errors: z.array(z.string()).default([]),
      failureReason: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).default({}),
      startedAt: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const meta: Record<string, unknown> = { ...data.metadata };
    if (data.failureReason) meta.failureReason = data.failureReason;

    const { data: inserted, error } = await supabaseAdmin
      .from("inventory_sync_logs")
      .insert({
        actor_id: context.userId,
        status: data.status,
        total_products: data.total,
        updated: data.updated,
        inserted: data.inserted,
        republished: data.republished,
        hidden: data.hidden,
        errors: data.errors,
        metadata: meta,
        started_at: data.startedAt ?? nowIso,
        completed_at: nowIso,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    if (data.status !== "completed") {
      await notifyAdmins(supabaseAdmin, {
        title: data.status === "cancelled" ? "تم إلغاء مزامنة المخزون" : "فشل مزامنة المخزون",
        body: data.failureReason ?? (data.errors[0] ?? "حدث خطأ أثناء مزامنة المخزون."),
        priority: data.status === "failed" ? "urgent" : "high",
        metadata: { syncLogId: (inserted as { id: string } | null)?.id, total: data.total, errors: data.errors.slice(0, 5) },
      });
    }
    return { id: (inserted as { id: string } | null)?.id ?? null };
  });

// Owner-only audit listing for inventory sync activity (legacy: from activity_logs).
export type InventorySyncLogRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  details: {
    total?: number;
    updated?: number;
    inserted?: number;
    republished?: number;
    hidden?: number;
    chunk?: boolean;
    skipHide?: boolean;
    errorCount?: number;
    errors?: { legacyId: number; message: string }[];
    updatedIds?: number[];
    insertedIds?: number[];
    hiddenIds?: string[];
  } | null;
};

export const listInventorySyncLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.enum(["all", "success", "errors"]).optional().default("all"),
      limit: z.number().int().min(1).max(500).optional().default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<InventorySyncLogRow[]> => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("activity_logs")
      .select("id, created_at, actor_id, actor_email, action, details")
      .in("action", ["inventory_sync", "inventory_sync_finalize"])
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    let result = (rows ?? []) as unknown as InventorySyncLogRow[];
    if (data.status === "success") {
      result = result.filter((r) => {
        const errs = (r.details as { errors?: unknown[] })?.errors;
        return !Array.isArray(errs) || errs.length === 0;
      });
    } else if (data.status === "errors") {
      result = result.filter((r) => {
        const errs = (r.details as { errors?: unknown[] })?.errors;
        return Array.isArray(errs) && errs.length > 0;
      });
    }
    return result;
  });

// New: structured per-run listing from inventory_sync_logs table.
export type InventorySyncRun = {
  id: string;
  actor_id: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  total_products: number;
  updated: number;
  inserted: number;
  republished: number;
  hidden: number;
  errors: string[];
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
};

export const listInventorySyncRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.enum(["all", "completed", "failed", "cancelled"]).optional().default("all"),
      limit: z.number().int().min(1).max(500).optional().default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<InventorySyncRun[]> => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("inventory_sync_logs")
      .select("id, actor_id, status, total_products, updated, inserted, republished, hidden, errors, metadata, started_at, completed_at")
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (data.from) q = q.gte("started_at", data.from);
    if (data.to) q = q.lte("started_at", data.to);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as unknown as InventorySyncRun[];
  });

// Recent health_checks history (admin/owner only).
export type HealthCheckRow = {
  id: string;
  status: "healthy" | "degraded" | "unhealthy";
  duration: number | null;
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  details: Record<string, unknown>;
  created_at: string;
};

export const listHealthChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional().default(50) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<HealthCheckRow[]> => {
    await assertAdminOrOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("health_checks")
      .select("id, status, duration, passed, failed, warnings, total, details, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return (rows ?? []) as unknown as HealthCheckRow[];
  });
