export type VerificationStatus = "pending" | "verified" | "rejected";

export type Doctor = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  slug: string;
  full_name_ar: string;
  full_name_en: string | null;
  title: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
  years_experience: number | null;
  languages: string[];
  gender: "male" | "female" | "other" | null;
  verification_status: VerificationStatus;
  is_public: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DoctorAvailability = {
  id: string;
  doctor_id: string;
  location_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
};

export type DoctorQualification = {
  id: string;
  doctor_id: string;
  title: string;
  institution: string | null;
  year: number | null;
  country: string | null;
  document_url: string | null;
};

export type Specialty = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  status: "active" | "inactive";
  sort_order: number;
};
