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
};

async function assertAdminOrOwner(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  if (!isAdmin && !isOwner) throw new Error("Forbidden");
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

    const report: SyncReport = { total: data.rows.length, updated: 0, inserted: 0, republished: 0, hidden: 0, errors: [] };
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
        if (!error) report.hidden += slice.length;
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
  .handler(async ({ data, context }): Promise<{ hidden: number }> => {
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
    for (let i = 0; i < toHide.length; i += 500) {
      const slice = toHide.slice(i, i + 500);
      const { error: e2 } = await supabaseAdmin
        .from("products")
        .update({ is_published: false, updated_at: nowIso })
        .in("id", slice);
      if (!e2) hidden += slice.length;
    }
    try {
      await supabaseAdmin.from("activity_logs").insert({
        actor_id: context.userId,
        action: "inventory_sync_finalize",
        entity_type: "products",
        details: { hidden, ...(data.aggregateReport ?? {}) } as unknown as Record<string, unknown>,
      } as never);
    } catch { /* optional */ }
    return { hidden };
  });

// Owner-only audit listing for inventory sync activity.
export type InventorySyncLogRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  details: Record<string, unknown>;
};

export const listInventorySyncLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      from: z.string().optional(),       // ISO date inclusive
      to: z.string().optional(),         // ISO date inclusive (end of day)
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
    let result = (rows ?? []) as InventorySyncLogRow[];
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
