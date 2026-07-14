export type SupplierStatus = "active" | "inactive" | "suspended";

export interface Supplier {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_sku: string | null;
  default_cost: number | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
}
