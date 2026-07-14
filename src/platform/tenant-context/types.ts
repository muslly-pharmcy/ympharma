export type OrganizationType =
  | "PHARMACY"
  | "CLINIC"
  | "LAB"
  | "INSURANCE"
  | "SUPPLIER"
  | "CORPORATE";

export type OrganizationStatus = "active" | "suspended" | "archived";
export type OrganizationRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited" | "suspended" | "removed";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithRole extends Organization {
  role: OrganizationRole;
}
