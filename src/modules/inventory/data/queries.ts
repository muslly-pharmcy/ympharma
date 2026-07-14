import { supabase } from "@/integrations/supabase/client";

export async function listStockBatches(orgId: string, warehouseId?: string) {
  let q = supabase.from("inv_stock_batches").select("*").eq("organization_id", orgId).order("expiry_date", { ascending: true });
  if (warehouseId) q = q.eq("warehouse_id", warehouseId);
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listMovements(orgId: string, limit = 100) {
  const { data, error } = await supabase.from("inv_stock_movements")
    .select("*").eq("organization_id", orgId)
    .order("occurred_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listTransfers(orgId: string) {
  const { data, error } = await supabase.from("inv_transfers")
    .select("*").eq("organization_id", orgId)
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listExpiryAlerts(orgId: string) {
  const { data, error } = await supabase.from("inv_expiry_alerts")
    .select("*").eq("organization_id", orgId)
    .is("acknowledged_at", null)
    .order("expiry_date", { ascending: true }).limit(200);
  if (error) throw error;
  return data ?? [];
}
