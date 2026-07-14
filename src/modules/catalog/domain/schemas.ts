// Phoenix Phase 4 — Zod schemas for catalog inputs.
import { z } from "zod";

export const CatalogStatusSchema = z.enum([
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "archived",
]);

export const MediaKindSchema = z.enum(["primary", "gallery", "thumbnail", "barcode"]);
export const MediaStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const AliasSourceSchema = z.enum(["manual", "ocr", "ai", "import"]);
export const AliasLocaleSchema = z.enum(["ar", "en", "mixed"]);

export const CreateProductSchema = z.object({
  organization_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  name_ar: z.string().min(1).max(300),
  name_en: z.string().min(1).max(300).nullable().optional(),
  generic_name: z.string().max(300).nullable().optional(),
  brand: z.string().max(200).nullable().optional(),
  manufacturer: z.string().max(200).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  active_ingredients: z.array(z.any()).default([]),
  dosage_form: z.string().max(100).nullable().optional(),
  strength: z.string().max(100).nullable().optional(),
  description_ar: z.string().max(4000).nullable().optional(),
  description_en: z.string().max(4000).nullable().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().uuid(),
});

export const AliasSchema = z.object({
  productId: z.string().uuid(),
  alias: z.string().min(1).max(200),
  locale: AliasLocaleSchema.default("ar"),
  source: AliasSourceSchema.default("manual"),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const SearchInputSchema = z.object({
  orgId: z.string().uuid().nullable().optional(),
  q: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20),
});

export const BarcodeLookupSchema = z.object({
  barcode: z.string().min(1).max(64),
  orgId: z.string().uuid().nullable().optional(),
});

// Media
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB

export const RequestUploadUrlSchema = z.object({
  productId: z.string().uuid(),
  kind: MediaKindSchema.default("gallery"),
  mime: z.enum(ALLOWED_MIME),
  bytes: z.number().int().min(1).max(MAX_MEDIA_BYTES),
});

export const RegisterMediaSchema = z.object({
  productId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  kind: MediaKindSchema.default("gallery"),
  mime: z.enum(ALLOWED_MIME),
  bytes: z.number().int().min(1).max(MAX_MEDIA_BYTES),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  checksum: z.string().max(128).nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const ReviewMediaSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).nullable().optional(),
});
