// Phoenix P7-A — event schemas (published later via the event bus).
import { z } from "zod";

export const AliasCreatedEvent = z.object({
  type: z.literal("product_intelligence.alias.created"),
  productId: z.string().uuid(),
  aliasId: z.string().uuid(),
  locale: z.enum(["ar", "en", "mixed"]),
  source: z.string(),
  actorId: z.string().uuid().nullable(),
});

export const AliasVerifiedEvent = z.object({
  type: z.literal("product_intelligence.alias.verified"),
  aliasId: z.string().uuid(),
  productId: z.string().uuid(),
  confidence: z.number(),
  actorId: z.string().uuid().nullable(),
});

export const MediaVerifiedEvent = z.object({
  type: z.literal("product_intelligence.media.verified"),
  mediaId: z.string().uuid(),
  productId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
});

export type ProductIntelligenceEvent =
  | z.infer<typeof AliasCreatedEvent>
  | z.infer<typeof AliasVerifiedEvent>
  | z.infer<typeof MediaVerifiedEvent>;
