// Phoenix Phase 4 — Catalog event payload schemas.
import { z } from "zod";

export const CatalogEventPayload = z.object({
  org_id: z.string().uuid().nullable().optional(),
  actor_user_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid(),
  media_id: z.string().uuid().nullable().optional(),
  data: z.record(z.string(), z.any()).default({}),
});
export type CatalogEventPayload = z.infer<typeof CatalogEventPayload>;

export const CATALOG_EVENTS = [
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_VERIFIED",
  "PRODUCT_IMAGE_ADDED",
] as const;
export type CatalogEventName = (typeof CATALOG_EVENTS)[number];
