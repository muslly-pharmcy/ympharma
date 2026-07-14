import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  receiveStockSchema, adjustStockSchema, createTransferSchema, scanExpirySchema,
  type ReceiveStockInput, type AdjustStockInput, type CreateTransferInput, type ScanExpiryInput,
} from "../domain/schemas";

export const receiveStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReceiveStockInput) => receiveStockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: batchId, error } = await context.supabase.rpc("inv_receive_stock", {
      _org: data.organization_id, _warehouse: data.warehouse_id, _product: data.product_id,
      _qty: data.qty, _batch_no: data.batch_no ?? null, _expiry: data.expiry_date ?? null,
      _cost: data.cost ?? null, _supplier: data.supplier_id ?? null, _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { batch_id: batchId as string };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AdjustStockInput) => adjustStockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: mvId, error } = await context.supabase.rpc("inv_adjust_stock", {
      _batch: data.batch_id, _qty_delta: data.qty_delta, _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { movement_id: mvId as string };
  });

export const createTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateTransferInput) => createTransferSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: xfer, error } = await context.supabase
      .from("inv_transfers")
      .insert({
        organization_id: data.organization_id,
        source_warehouse_id: data.source_warehouse_id,
        dest_warehouse_id: data.dest_warehouse_id,
        status: "draft",
        notes: data.notes ?? null,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !xfer) throw new Error(error?.message ?? "insert failed");
    const { error: itemsErr } = await context.supabase
      .from("inv_transfer_items")
      .insert(data.items.map((i) => ({ transfer_id: xfer.id, product_id: i.product_id, qty_requested: i.qty_requested })));
    if (itemsErr) throw new Error(itemsErr.message);
    return { transfer_id: xfer.id as string };
  });

export const reserveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transfer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: n, error } = await context.supabase.rpc("inv_reserve_for_transfer", { _transfer: data.transfer_id });
    if (error) throw new Error(error.message);
    return { batches_reserved: n as number };
  });

export const dispatchTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transfer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("inv_dispatch_transfer", { _transfer: data.transfer_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const receiveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transfer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("inv_receive_transfer", { _transfer: data.transfer_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const scanExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ScanExpiryInput) => scanExpirySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: n, error } = await context.supabase.rpc("inv_scan_expiry", {
      _org: data.organization_id, _horizon_days: data.horizon_days,
    });
    if (error) throw new Error(error.message);
    return { alerts_created: n as number };
  });
