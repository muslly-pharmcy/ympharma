export type MovementType =
  | "STOCK_RECEIVED"
  | "STOCK_TRANSFERRED_OUT"
  | "STOCK_TRANSFERRED_IN"
  | "STOCK_SOLD"
  | "STOCK_ADJUSTED"
  | "STOCK_EXPIRED"
  | "STOCK_RESERVED"
  | "STOCK_RELEASED";

export type TransferStatus =
  | "draft" | "approved" | "reserved" | "picked"
  | "packed" | "dispatched" | "received" | "cancelled";

export type ExpiryTier = "NEAR_90" | "NEAR_60" | "NEAR_30" | "EXPIRED";

export interface StockBatch {
  id: string;
  organization_id: string;
  warehouse_id: string;
  location_id: string | null;
  product_id: string;
  supplier_id: string | null;
  batch_no: string | null;
  expiry_date: string | null;
  qty_on_hand: number;
  qty_reserved: number;
  cost: number | null;
  selling_price: number | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  warehouse_id: string;
  batch_id: string | null;
  product_id: string;
  movement_type: MovementType;
  qty_delta: number;
  actor_user_id: string | null;
  reason: string | null;
  ref_type: string | null;
  ref_id: string | null;
  occurred_at: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  organization_id: string;
  code: string | null;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  status: TransferStatus;
  requested_by: string | null;
  approved_by: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  batch_id: string | null;
  qty_requested: number;
  qty_reserved: number;
  qty_picked: number;
  qty_received: number;
}

export interface ExpiryAlert {
  id: string;
  organization_id: string;
  batch_id: string;
  tier: ExpiryTier;
  qty_at_alert: number;
  expiry_date: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}
