export type Patient = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
