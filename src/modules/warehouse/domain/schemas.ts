import { z } from "zod";

export const createWarehouseSchema = z.object({
  organization_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  kind: z.enum(["central", "branch", "virtual", "transit"]).default("central"),
  address: z.string().max(500).optional().nullable(),
});
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const createLocationSchema = z.object({
  warehouse_id: z.string().uuid(),
  code: z.string().min(1).max(40),
  label: z.string().max(200).optional().nullable(),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
