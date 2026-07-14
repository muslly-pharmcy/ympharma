export type OrganizationType =
  | "PHARMACY"
  | "CLINIC"
  | "LAB"
  | "INSURANCE"
  | "SUPPLIER"
  | "CORPORATE";

export type OrganizationStatus = "active" | "suspended" | "archived";
export type OrganizationRole =
  | "owner"
  | "admin"
  | "manager"
  | "employee"
  | "pharmacist"
  | "doctor"
  | "supplier_user"
  | "insurance_user"
  | "customer";
export type MemberStatus = "active" | "invited" | "suspended" | "removed";

export type OrgMetadataValue =
  | string
  | number
  | boolean
  | null
  | OrgMetadataValue[]
  | { [key: string]: OrgMetadataValue };
export type OrgMetadata = { [key: string]: OrgMetadataValue };

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  metadata: OrgMetadata;
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
