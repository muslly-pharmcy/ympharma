import { z } from "zod";

export const createUploadSchema = z.object({
  organization_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  mime_type: z.string().max(100),
  source: z.enum(["camera", "file"]).default("camera"),
  file_ext: z.string().regex(/^[a-z0-9]{2,5}$/).default("jpg"),
});
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export const extractSchema = z.object({
  upload_id: z.string().uuid(),
});

export const updateLineSchema = z.object({
  line_id: z.string().uuid(),
  patch: z.object({
    user_confirmed_product_id: z.string().uuid().nullable().optional(),
    user_confirmed_qty: z.number().nonnegative().nullable().optional(),
    user_confirmed_cost: z.number().nonnegative().nullable().optional(),
    user_confirmed_expiry: z.string().nullable().optional(),
    status: z.enum(["pending", "confirmed", "skipped"]).optional(),
  }),
});

export const commitSchema = z.object({
  upload_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
});

export const cancelSchema = z.object({ upload_id: z.string().uuid() });
export const getSchema = z.object({ upload_id: z.string().uuid() });
