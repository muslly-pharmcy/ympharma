// Phoenix Phase 4 — Catalog domain types.
export type CatalogStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";

export type MediaKind = "primary" | "gallery" | "thumbnail" | "barcode";
export type MediaStatus = "pending" | "approved" | "rejected";
export type AliasSource = "manual" | "ocr" | "ai" | "import";
export type AliasLocale = "ar" | "en" | "mixed";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CatalogProduct {
  id: string;
  organization_id: string | null;
  owner_org_id: string | null;
  category_id: string | null;
  name_ar: string;
  name_en: string | null;
  generic_name: string | null;
  brand: string | null;
  manufacturer: string | null;
  barcode: string | null;
  active_ingredients: JsonValue[];
  dosage_form: string | null;
  strength: string | null;
  description_ar: string | null;
  description_en: string | null;
  metadata: { [key: string]: JsonValue };
  status: CatalogStatus;
  is_public: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogAlias {
  id: string;
  product_id: string;
  alias: string;
  alias_normalized: string;
  locale: AliasLocale;
  source: AliasSource;
  confidence: number | null;
}

export interface CatalogMedia {
  id: string;
  product_id: string;
  storage_bucket: string;
  storage_path: string;
  kind: MediaKind;
  status: MediaStatus;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string | null;
  checksum: string | null;
  sort_order: number;
}

export interface SearchHit {
  id: string;
  name_ar: string;
  name_en: string | null;
  generic_name: string | null;
  brand: string | null;
  score: number;
}
