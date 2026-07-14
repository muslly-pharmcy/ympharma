type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface Branch {
  id: string;
  organization_id: string | null;
  code: string | null;
  name: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  manager_user_id: string | null;
  is_active: boolean;
  location: JsonObject;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface BranchAssignment {
  id: string;
  branch_id: string;
  user_id: string;
  role: string;
  status: string;
  assigned_by: string | null;
  created_at: string;
}
