import { z } from "zod";

export const createSupplierSchema = z.object({
  organization_id: z.string().uuid(),
  code: z.string().max(40).optional().nullable(),
  name: z.string().min(1).max(200),
  legal_name: z.string().max(200).optional().nullable(),
  tax_id: z.string().max(80).optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const linkSupplierProductSchema = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  supplier_sku: z.string().max(80).optional().nullable(),
  default_cost: z.number().nonnegative().optional().nullable(),
  lead_time_days: z.number().int().nonnegative().optional().nullable(),
  min_order_qty: z.number().int().positive().optional().nullable(),
});
export type LinkSupplierProductInput = z.infer<typeof linkSupplierProductSchema>;
