// Phoenix Phase 4 — AI integration contracts. Contracts only; no model calls.
// Consumers (Phase 5+) implement handlers that fulfill these shapes and
// persist results into public.catalog_ai_signals.
import { z } from "zod";

export const OcrExtractionInput = z.object({
  productId: z.string().uuid().nullable(),
  mediaId: z.string().uuid(),
  imageUrl: z.string().url(),
  hintLocale: z.enum(["ar", "en", "mixed"]).default("mixed"),
});
export const OcrExtractionResult = z.object({
  text: z.string(),
  blocks: z.array(z.object({ text: z.string(), confidence: z.number().min(0).max(1) })).default([]),
  detectedBarcode: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const BarcodeRecognitionInput = z.object({
  imageUrl: z.string().url(),
});
export const BarcodeRecognitionResult = z.object({
  barcode: z.string(),
  symbology: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const ImageRecognitionInput = z.object({
  imageUrl: z.string().url(),
  hint: z.string().optional(),
});
export const ImageRecognitionResult = z.object({
  candidates: z.array(z.object({ productId: z.string().uuid(), score: z.number() })),
});

export const InvoiceParseInput = z.object({
  imageUrl: z.string().url(),
  organizationId: z.string().uuid(),
});
export const InvoiceParseResult = z.object({
  supplier: z.string().nullable(),
  lineItems: z.array(z.object({ name: z.string(), qty: z.number(), unitPrice: z.number().nullable() })),
  totals: z.object({ subtotal: z.number().nullable(), total: z.number().nullable() }),
  confidence: z.number().min(0).max(1),
});

export const PrescriptionParseInput = z.object({
  imageUrl: z.string().url(),
  patientId: z.string().uuid().nullable().optional(),
});
export const PrescriptionParseResult = z.object({
  medications: z.array(z.object({ name: z.string(), dose: z.string().nullable(), frequency: z.string().nullable() })),
  doctorName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type OcrExtractionInput = z.infer<typeof OcrExtractionInput>;
export type OcrExtractionResult = z.infer<typeof OcrExtractionResult>;
export type BarcodeRecognitionInput = z.infer<typeof BarcodeRecognitionInput>;
export type BarcodeRecognitionResult = z.infer<typeof BarcodeRecognitionResult>;
export type ImageRecognitionInput = z.infer<typeof ImageRecognitionInput>;
export type ImageRecognitionResult = z.infer<typeof ImageRecognitionResult>;
export type InvoiceParseInput = z.infer<typeof InvoiceParseInput>;
export type InvoiceParseResult = z.infer<typeof InvoiceParseResult>;
export type PrescriptionParseInput = z.infer<typeof PrescriptionParseInput>;
export type PrescriptionParseResult = z.infer<typeof PrescriptionParseResult>;
