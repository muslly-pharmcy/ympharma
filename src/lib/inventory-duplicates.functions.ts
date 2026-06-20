// Server functions for the "duplicate products" admin tab, the
// "bulk +N preview/apply" workflow, supplier link editing with rollback,
// and CSV export of preview rows. All require owner/admin access.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeProductKey } from "@/lib/product-normalize";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!data) throw new Error("صلاحية الأدمن مطلوبة");
}

export type DuplicateGroup = {
  key: string;
  display_name: string;
  dosages: string[];
  count: number;
  total_stock: number;
  items: Array<{
    id: string;
    legacy_id: number | null;
    name: string;
    brand: string | null;
    price: number;
    stock_qty: number;
    supplier_name: string | null;
    supplier_cost: number | null;
    is_published: boolean;
  }>;
};

export const listDuplicateProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("id,legacy_id,name,brand,price,stock_qty,supplier_name,supplier_cost,is_published")
      .order("name", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);

    const groups = new Map<string, DuplicateGroup>();
    for (const r of (data ?? []) as any[]) {
      const { key, dosages } = normalizeProductKey(r.name ?? "");
      if (!key || key === "|") continue;
      let g = groups.get(key);
      if (!g) {
        g = { key, display_name: r.name, dosages, count: 0, total_stock: 0, items: [] };
        groups.set(key, g);
      }
      g.count++;
      g.total_stock += Number(r.stock_qty ?? 0);
      g.items.push(r);
    }
    return Array.from(groups.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => b.count - a.count || b.total_stock - a.total_stock);
  });

// ---------- Supplier linking with audit + rollback ----------

const linkSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    supplier_name: z.string().trim().min(1).max(160),
    supplier_cost: z.number().min(0).max(10_000_000).nullable().optional(),
  })).min(1).max(200),
  reason: z.string().trim().min(3).max(200),
});

export const linkSuppliersBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => linkSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Get current snapshot for rollback.
    const ids = data.items.map((i) => i.id);
    const { data: snap, error: se } = await context.supabase
      .from("products").select("id, supplier_name, supplier_cost").in("id", ids);
    if (se) throw new Error(se.message);
    const snapMap = new Map<string, { supplier_name: string | null; supplier_cost: number | null }>(
      (snap ?? []).map((r: any) => [r.id, { supplier_name: r.supplier_name, supplier_cost: r.supplier_cost }]),
    );

    // Single batch id groups all rows of this operation for rollback.
    const batchId = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const auditRows: any[] = [];
    let applied = 0;

    for (const it of data.items) {
      const before = snapMap.get(it.id) ?? { supplier_name: null, supplier_cost: null };
      const patch: Record<string, unknown> = { supplier_name: it.supplier_name };
      if (it.supplier_cost !== undefined) patch.supplier_cost = it.supplier_cost;
      const { error } = await context.supabase.from("products").update(patch as never).eq("id", it.id);
      if (error) continue;
      applied++;
      auditRows.push({
        batch_id: batchId,
        product_id: it.id,
        before_supplier_name: before.supplier_name,
        after_supplier_name: it.supplier_name,
        before_supplier_cost: before.supplier_cost,
        after_supplier_cost: it.supplier_cost ?? before.supplier_cost,
        reason: data.reason,
        performed_by: context.userId,
      });
    }
    if (auditRows.length) {
      await context.supabase.from("supplier_link_audit").insert(auditRows as never);
    }
    await context.supabase.rpc("log_activity", {
      _action: "supplier.link_batch",
      _details: { batch_id: batchId, applied, count: data.items.length, reason: data.reason } as never,
    });
    return { applied, count: data.items.length, batch_id: batchId };
  });

export const rollbackSupplierBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batch_id: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("supplier_link_audit")
      .select("id, product_id, before_supplier_name, before_supplier_cost, rolled_back_at")
      .eq("batch_id", data.batch_id);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("لا توجد عملية بهذا المعرف");

    let restored = 0;
    for (const r of rows as any[]) {
      if (r.rolled_back_at) continue;
      const { error: ue } = await context.supabase
        .from("products")
        .update({ supplier_name: r.before_supplier_name, supplier_cost: r.before_supplier_cost } as never)
        .eq("id", r.product_id);
      if (ue) continue;
      await context.supabase.from("supplier_link_audit")
        .update({ rolled_back_at: new Date().toISOString(), rolled_back_by: context.userId } as never)
        .eq("id", r.id);
      restored++;
    }
    await context.supabase.rpc("log_activity", {
      _action: "supplier.rollback_batch",
      _details: { batch_id: data.batch_id, restored } as never,
    });
    return { restored, total: rows.length };
  });

export const listSupplierBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("supplier_link_audit")
      .select("batch_id, reason, performed_by, rolled_back_at, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    const map = new Map<string, any>();
    for (const r of (data ?? []) as any[]) {
      const b = map.get(r.batch_id) ?? { batch_id: r.batch_id, reason: r.reason, performed_by: r.performed_by, created_at: r.created_at, count: 0, rolled_back: 0 };
      b.count++;
      if (r.rolled_back_at) b.rolled_back++;
      map.set(r.batch_id, b);
    }
    return Array.from(map.values()).slice(0, 100);
  });

// ---------- Bulk stock add (preview + apply + CSV) ----------

const scopeSchema = z.enum(["published", "tracked", "out_of_stock"]);

async function fetchScope(supabase: any, scope: z.infer<typeof scopeSchema>) {
  let q = supabase
    .from("products")
    .select("id,legacy_id,name,brand,stock_qty,track_stock,is_published,supplier_name")
    .order("name", { ascending: true })
    .limit(5000);
  if (scope === "published") q = q.eq("is_published", true);
  if (scope === "tracked") q = q.eq("track_stock", true);
  if (scope === "out_of_stock") q = q.lte("stock_qty", 0);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string; legacy_id: number | null; name: string; brand: string | null;
    stock_qty: number; track_stock: boolean; is_published: boolean; supplier_name: string | null;
  }>;
}

export const previewBulkAddStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      delta: z.number().int().min(-1000).max(1000),
      scope: scopeSchema,
      reason: z.string().trim().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = await fetchScope(context.supabase, data.scope);
    return {
      delta: data.delta,
      scope: data.scope,
      reason: data.reason ?? "",
      count: rows.length,
      total_before: rows.reduce((s, r) => s + (r.stock_qty ?? 0), 0),
      total_after: rows.reduce((s, r) => s + Math.max(0, (r.stock_qty ?? 0) + data.delta), 0),
      rows: rows.map((r) => ({
        legacy_id: r.legacy_id,
        id: r.id,
        name: r.name,
        brand: r.brand,
        supplier_name: r.supplier_name,
        before_qty: r.stock_qty,
        after_qty: Math.max(0, (r.stock_qty ?? 0) + data.delta),
        reason: data.reason ?? "",
      })),
    };
  });

export const applyBulkAddStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      delta: z.number().int().min(-1000).max(1000),
      scope: scopeSchema,
      reason: z.string().trim().min(3).max(200),
      confirm: z.literal(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = await fetchScope(context.supabase, data.scope);
    try {
      await context.supabase.rpc("set_config" as never, {
        key: "app.adjust_reason", value: data.reason, is_local: true,
      } as never);
    } catch { /* optional rpc — trigger still logs with NULL reason */ }

    let applied = 0;
    for (const r of rows) {
      const next = Math.max(0, (r.stock_qty ?? 0) + data.delta);
      const { error } = await context.supabase
        .from("products").update({ stock_qty: next } as never).eq("id", r.id);
      if (!error) applied++;
    }
    await context.supabase.rpc("log_activity", {
      _action: "inventory.bulk_add",
      _details: { applied, count: rows.length, delta: data.delta, scope: data.scope, reason: data.reason } as never,
    });
    return { applied, count: rows.length };
  });

// ---------- Trigger health / monitoring ----------

export const triggerHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("trigger_metrics")
      .select("status, duration_ms, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    const all = (data ?? []) as Array<{ status: string; duration_ms: number | null; error_message: string | null; created_at: string }>;
    const ok = all.filter((r) => r.status === "ok");
    const fail = all.filter((r) => r.status === "failed");
    const sum = ok.reduce((s, r) => s + (Number(r.duration_ms) || 0), 0);
    return {
      window_hours: 24,
      total: all.length,
      ok: ok.length,
      failed: fail.length,
      failure_rate: all.length ? fail.length / all.length : 0,
      avg_duration_ms: ok.length ? sum / ok.length : 0,
      last_failures: fail.slice(0, 10),
    };
  });
