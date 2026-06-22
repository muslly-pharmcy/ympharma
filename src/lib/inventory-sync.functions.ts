// Admin-only inventory sync from parsed Excel rows.
// Client parses the .xls with `xlsx` then sends rows here.
// Returns a report: updated / inserted / republished / hidden.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RowSchema = z.object({
  legacyId: z.number().int().positive(),
  name: z.string().min(1),
  supplier: z.string().optional().nullable(),
  expiry: z.string().optional().nullable(), // ISO YYYY-MM-DD or empty
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

export const runInventorySync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(RowSchema).min(1).max(20000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<SyncReport> => {
    // Require admin/owner
    const { data: isAdmin } = await context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "admin" } as never,
    );
    const { data: isOwner } = await context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "owner" } as never,
    );
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch existing products keyed by legacy_id (only those that have one).
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("products")
      .select("id, legacy_id, is_published")
      .not("legacy_id", "is", null);
    if (fetchErr) throw fetchErr;

    const byLegacy = new Map<number, { id: string; is_published: boolean }>();
    for (const p of existing ?? []) {
      if (typeof p.legacy_id === "number") byLegacy.set(p.legacy_id, { id: p.id, is_published: !!p.is_published });
    }

    const report: SyncReport = { total: data.rows.length, updated: 0, inserted: 0, republished: 0, hidden: 0, errors: [] };
    const seenLegacy = new Set<number>();
    const nowIso = new Date().toISOString();

    for (const row of data.rows) {
      seenLegacy.add(row.legacyId);
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

    // Soft-delete: hide previously-published items whose legacy_id is no longer in the file.
    const toHide: string[] = [];
    for (const [legacy, info] of byLegacy.entries()) {
      if (!seenLegacy.has(legacy) && info.is_published) toHide.push(info.id);
    }
    if (toHide.length > 0) {
      // Chunk to avoid huge IN lists.
      for (let i = 0; i < toHide.length; i += 500) {
        const slice = toHide.slice(i, i + 500);
        const { error } = await supabaseAdmin
          .from("products")
          .update({ is_published: false, updated_at: nowIso })
          .in("id", slice);
        if (!error) report.hidden += slice.length;
      }
    }

    // Best-effort audit log.
    try {
      await supabaseAdmin.from("activity_logs").insert({
        user_id: context.userId,
        action: "inventory_sync",
        entity_type: "products",
        metadata: report as unknown as Record<string, unknown>,
      } as never);
    } catch { /* logging optional */ }

    return report;
  });
