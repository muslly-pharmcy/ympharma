// Inventory transfer workflow server functions.
// Covers create → approve → reserve → picking → packed → dispatched →
// in_transit → received → completed, plus cancel/reject.
// All stock movements go through SECURITY DEFINER RPCs (idempotent + audited).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type TransferStatus =
  | "REQUESTED" | "APPROVED" | "RESERVED" | "PICKING" | "PACKED"
  | "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "COMPLETED"
  | "CANCELLED" | "REJECTED";

async function loadTransfer(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select("id,status,source_branch_id,destination_branch_id,transfer_type,correlation_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("التحويل غير موجود");
  return data as {
    id: string; status: TransferStatus;
    source_branch_id: string | null;
    destination_branch_id: string | null;
    transfer_type: "WH_TO_BRANCH" | "BRANCH_TO_BRANCH" | "BRANCH_TO_WH";
    correlation_id: string;
  };
}

async function assertCanActOn(supabase: any, userId: string, t: {
  source_branch_id: string | null; destination_branch_id: string | null;
}) {
  const { data: role } = await supabase
    .from("user_roles").select("role").eq("user_id", userId)
    .in("role", ["owner", "admin"]).maybeSingle();
  if (role) return;
  const branchIds = [t.source_branch_id, t.destination_branch_id].filter(Boolean) as string[];
  if (branchIds.length === 0) throw new Error("صلاحيات غير كافية");
  const { data: assigns } = await supabase
    .from("branch_user_assignments")
    .select("branch_id").eq("user_id", userId).in("branch_id", branchIds);
  if (!assigns || assigns.length === 0) throw new Error("صلاحيات غير كافية لهذا التحويل");
}

async function setStatus(
  supabase: any, id: string, next: TransferStatus, reason?: string | null,
) {
  const patch: Record<string, unknown> = { status: next };
  if (reason !== undefined) patch.reason = reason;
  const { error } = await supabase
    .from("inventory_transfers").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true, status: next };
}

// ── List ──────────────────────────────────────────────────────────────

export const listTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.string().optional(),
      branch_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("inventory_transfers")
      .select("id,correlation_id,transfer_type,status,source_branch_id,destination_branch_id,requested_by,reason,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.branch_id) {
      q = q.or(`source_branch_id.eq.${data.branch_id},destination_branch_id.eq.${data.branch_id}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const getTransfer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: head, error: e1 }, { data: items, error: e2 }, { data: audit, error: e3 }] =
      await Promise.all([
        context.supabase
          .from("inventory_transfers")
          .select("*")
          .eq("id", data.id).maybeSingle(),
        context.supabase
          .from("transfer_items")
          .select("id,product_id,qty_requested,qty_picked,qty_received,products!inner(name,legacy_id)")
          .eq("transfer_id", data.id),
        context.supabase
          .from("transfer_audit_log")
          .select("id,from_status,to_status,actor_user_id,reason,created_at")
          .eq("transfer_id", data.id)
          .order("created_at", { ascending: true }),
      ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);
    if (!head) throw new Error("التحويل غير موجود");
    return { transfer: head, items: items ?? [], audit: audit ?? [] };
  });

// ── Create ────────────────────────────────────────────────────────────

const createSchema = z.object({
  transfer_type: z.enum(["WH_TO_BRANCH", "BRANCH_TO_BRANCH", "BRANCH_TO_WH"]),
  source_branch_id: z.string().uuid(),
  destination_branch_id: z.string().uuid(),
  reason: z.string().trim().max(400).optional(),
  notes: z.string().trim().max(1000).optional(),
  correlation_id: z.string().trim().min(8).max(80).optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty_requested: z.number().int().min(1).max(1_000_000),
  })).min(1).max(500),
});

export const createTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.source_branch_id === data.destination_branch_id) {
      throw new Error("المصدر والوجهة لا يمكن أن يكونا متطابقين");
    }
    await assertCanActOn(context.supabase, context.userId, {
      source_branch_id: data.source_branch_id,
      destination_branch_id: data.destination_branch_id,
    });
    const correlation =
      data.correlation_id ?? `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: head, error } = await (context.supabase.from("inventory_transfers") as any)
      .insert({
        correlation_id: correlation,
        transfer_type: data.transfer_type,
        source_branch_id: data.source_branch_id,
        destination_branch_id: data.destination_branch_id,
        requested_by: context.userId,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
      })
      .select("id,correlation_id").single();
    if (error) throw new Error(error.message);
    const transferId = (head as { id: string }).id;

    const items = data.items.map((i) => ({
      transfer_id: transferId,
      product_id: i.product_id,
      qty_requested: i.qty_requested,
    }));
    const { error: itemsErr } = await (context.supabase.from("transfer_items") as any).insert(items);
    if (itemsErr) {
      // best-effort rollback so we don't leave a transfer with no lines
      await context.supabase.from("inventory_transfers").delete().eq("id", transferId);
      throw new Error(itemsErr.message);
    }
    return { ok: true, id: transferId, correlation_id: correlation };
  });

// ── Transitions ───────────────────────────────────────────────────────

const idSchema = z.object({ id: z.string().uuid(), reason: z.string().trim().max(400).optional() });

export const approveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    if (t.status !== "REQUESTED") throw new Error(`لا يمكن الموافقة من الحالة ${t.status}`);
    return setStatus(context.supabase, data.id, "APPROVED", data.reason);
  });

export const reserveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    const { data: result, error } = await context.supabase
      .rpc("reserve_transfer_stock" as never, { _transfer_id: data.id } as never);
    if (error) throw new Error(error.message);
    return { ok: true, status: "RESERVED" as const, result };
  });

const advanceMap = {
  markPicking:    { from: "RESERVED",   to: "PICKING" },
  markPacked:     { from: "PICKING",    to: "PACKED" },
  markDispatched: { from: "PACKED",     to: "DISPATCHED" },
  markInTransit:  { from: "DISPATCHED", to: "IN_TRANSIT" },
} as const;

function makeAdvance(key: keyof typeof advanceMap) {
  const { from, to } = advanceMap[key];
  return createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((d: unknown) => idSchema.parse(d))
    .handler(async ({ data, context }) => {
      const t = await loadTransfer(context.supabase, data.id);
      await assertCanActOn(context.supabase, context.userId, t);
      if (t.status !== from) {
        throw new Error(`الحالة الحالية ${t.status} لا تسمح بالانتقال إلى ${to}`);
      }
      return setStatus(context.supabase, data.id, to as TransferStatus, data.reason);
    });
}

export const markPicking    = makeAdvance("markPicking");
export const markPacked     = makeAdvance("markPacked");
export const markDispatched = makeAdvance("markDispatched");
export const markInTransit  = makeAdvance("markInTransit");

const receiveSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(400).optional(),
  items: z.array(z.object({
    item_id: z.string().uuid(),
    qty_received: z.number().int().min(0).max(1_000_000),
  })).optional(),
});

export const markReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => receiveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    if (t.status !== "IN_TRANSIT") {
      throw new Error(`الاستلام يتطلب الحالة IN_TRANSIT، الحالية ${t.status}`);
    }
    if (data.items && data.items.length) {
      for (const it of data.items) {
        const { error } = await context.supabase
          .from("transfer_items")
          .update({ qty_received: it.qty_received })
          .eq("id", it.item_id).eq("transfer_id", data.id);
        if (error) throw new Error(error.message);
      }
    }
    return setStatus(context.supabase, data.id, "RECEIVED", data.reason);
  });

export const completeTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    const { data: result, error } = await context.supabase
      .rpc("commit_transfer_receipt" as never, { _transfer_id: data.id } as never);
    if (error) throw new Error(error.message);
    return { ok: true, status: "COMPLETED" as const, result };
  });

export const cancelTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(t.status)) {
      throw new Error(`لا يمكن إلغاء تحويل بالحالة ${t.status}`);
    }
    if (["RESERVED", "PICKING", "PACKED"].includes(t.status)) {
      const { error: relErr } = await context.supabase
        .rpc("release_transfer_reservation" as never, {
          _transfer_id: data.id, _reason: data.reason ?? "cancelled",
        } as never);
      if (relErr) throw new Error(relErr.message);
    }
    return setStatus(context.supabase, data.id, "CANCELLED", data.reason ?? "cancelled");
  });

export const rejectTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const t = await loadTransfer(context.supabase, data.id);
    await assertCanActOn(context.supabase, context.userId, t);
    if (t.status !== "REQUESTED") {
      throw new Error(`الرفض ممكن فقط من الحالة REQUESTED (الحالية ${t.status})`);
    }
    return setStatus(context.supabase, data.id, "REJECTED", data.reason ?? "rejected");
  });
