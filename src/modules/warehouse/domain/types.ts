export type WarehouseKind = "central" | "branch" | "virtual" | "transit";

export interface Warehouse {
  id: string;
  organization_id: string;
  branch_id: string | null;
  code: string;
  name: string;
  kind: WarehouseKind;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  code: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}
