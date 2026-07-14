// Phoenix P7-A — Product intelligence types.
import type { MatchKind } from "./aliases";

export type { MatchKind };

export interface ProductAlias {
  id: string;
  productId: string;
  alias: string;
  aliasNormalized: string;
  locale: "ar" | "en" | "mixed";
  source: string;
  confidence: number | null;
  verified?: boolean;
}

export interface ProductMediaRef {
  id: string;
  productId: string;
  storageBucket: string;
  storagePath: string;
  kind: "primary" | "gallery" | "thumbnail" | string;
  status: "pending" | "approved" | "rejected" | string;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
}

export interface SearchHit {
  id: string;
  name_ar: string;
  name_en: string | null;
  generic_name: string | null;
  brand: string | null;
  dosage_form: string | null;
  strength: string | null;
  match_kind: MatchKind;
  score: number;
}
