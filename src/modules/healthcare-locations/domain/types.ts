export type LocationKind = "clinic" | "hospital" | "medical_center" | "pharmacy_clinic";

export type HealthcareLocation = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  kind: LocationKind;
  name_ar: string;
  name_en: string | null;
  address: string | null;
  city: string | null;
  governorate: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  working_hours: Record<string, unknown>;
  is_active: boolean;
  metadata: Record<string, unknown>;
};
