// Phoenix P7-A — zod schemas for product intelligence.
import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().max(200),
  limit: z.number().int().min(1).max(50).default(20),
});

export const NormalizationInputSchema = z.object({
  q: z.string().max(500),
});

export const AliasInputSchema = z.object({
  productId: z.string().uuid(),
  alias: z.string().min(1).max(200),
  locale: z.enum(["ar", "en", "mixed"]).default("ar"),
  source: z.string().max(64).default("manual"),
  confidence: z.number().min(0).max(1).optional(),
});

export const VerifyAliasSchema = z.object({
  aliasId: z.string().uuid(),
  confidence: z.number().min(0).max(1).default(1),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type AliasInput = z.infer<typeof AliasInputSchema>;
