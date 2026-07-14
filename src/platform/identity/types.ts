// Phoenix Phase 3 — Identity types (app-level, not Supabase Auth).
export type ProfileStatus = "active" | "suspended" | "deleted";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string;
  notification_prefs: JsonObject;
  status: ProfileStatus;
  profile_completed_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export type PermissionKey =
  | "org.manage"
  | "org.read"
  | "members.manage"
  | "members.read"
  | "branches.manage"
  | "branches.read"
  | "inventory.read"
  | "inventory.update"
  | "orders.read"
  | "orders.manage"
  | "prescriptions.read"
  | "prescriptions.review"
  | "patients.view"
  | "reports.export"
  | "subscriptions.manage"
  | (string & {});
