import { z } from "zod";

export const receiveStockSchema = z.object({
  organization_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  product_id: z.string().uuid(),
  qty: z.number().positive(),
  batch_no: z.string().max(80).optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

export const adjustStockSchema = z.object({
  batch_id: z.string().uuid(),
  qty_delta: z.number().refine((n) => n !== 0, "qty_delta must be non-zero"),
  reason: z.string().min(1).max(500),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const createTransferSchema = z.object({
  organization_id: z.string().uuid(),
  source_warehouse_id: z.string().uuid(),
  dest_warehouse_id: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty_requested: z.number().positive(),
  })).min(1),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const scanExpirySchema = z.object({
  organization_id: z.string().uuid(),
  horizon_days: z.number().int().min(1).max(365).default(90),
});
export type ScanExpiryInput = z.infer<typeof scanExpirySchema>;
