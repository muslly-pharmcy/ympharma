// Phoenix Pharmacy Network — shared types.
export type PnAvailability = "in_stock" | "low" | "out";
export type PnVerificationStatus = "pending" | "verified" | "rejected";

export interface PnPharmacySummary {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  whatsapp: string | null;
  lat: number | null;
  lng: number | null;
  is_24_7: boolean;
  logo_url: string | null;
  verification_status: PnVerificationStatus;
}

export interface PnSearchHit {
  pharmacy_id: string;
  pharmacy_slug: string;
  pharmacy_name_ar: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  whatsapp: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  catalog_product_id: string;
  product_name: string;
  availability: PnAvailability;
  price_yer: number | null;
  price_visible: boolean;
  expiry_date: string | null;
}

export interface PnPharmacyHours {
  weekday: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}
