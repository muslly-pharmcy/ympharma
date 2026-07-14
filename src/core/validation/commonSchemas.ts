import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const orgIdSchema = uuidSchema;
export const userIdSchema = uuidSchema;
export const isoDateSchema = z.string().datetime();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;
