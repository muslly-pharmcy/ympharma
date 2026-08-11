// Server-only helpers behind `src/lib/reorder.functions.ts`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshReorderSuggestions } from '@/lib/inventory/reorder-engine.server'

type Client = SupabaseClient<any, 'public', any>

export interface SuggestionRow {
  id: string
  product_id: string
  warehouse_id: string
  supplier_id: string | null
  on_hand: number
  daily_burn_rate: number
  lead_time_days: number
  reorder_point: number
  suggested_qty: number
  days_of_cover: number | null
  status: string
  computed_at: string
  product_name: string | null
  warehouse_name: string | null
}

/** Purchasing writers only — verified through the caller's own RLS session. */
export async function assertPurchasingWrite(
  supabase: Client,
  userId: string,
  organizationId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('has_org_permission', {
    _user_id: userId,
    _org_id: organizationId,
    _permission: 'purchasing.write',
  })
  if (error || data !== true) throw new Error('Forbidden: purchasing.write required')
}

export async function runRefresh(params: {
  organizationId: string
  windowDays?: number
  leadTimeDays?: number
  coverDays?: number
}) {
  return refreshReorderSuggestions(params)
}

export async function fetchSuggestions(
  supabase: Client,
  params: { organizationId: string; status?: string; limit?: number },
): Promise<SuggestionRow[]> {
  const { data, error } = await supabase
    .from('inv_reorder_suggestions')
    .select(
      'id, product_id, warehouse_id, supplier_id, on_hand, daily_burn_rate, lead_time_days, reorder_point, suggested_qty, days_of_cover, status, computed_at, catalog_products(name_ar, name_en), wh_warehouses(name)',
    )
    .eq('organization_id', params.organizationId)
    .eq('status', params.status ?? 'open')
    .order('days_of_cover', { ascending: true, nullsFirst: true })
    .limit(params.limit ?? 100)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    product_id: row.product_id,
    warehouse_id: row.warehouse_id,
    supplier_id: row.supplier_id,
    on_hand: Number(row.on_hand ?? 0),
    daily_burn_rate: Number(row.daily_burn_rate ?? 0),
    lead_time_days: Number(row.lead_time_days ?? 0),
    reorder_point: Number(row.reorder_point ?? 0),
    suggested_qty: Number(row.suggested_qty ?? 0),
    days_of_cover: row.days_of_cover === null ? null : Number(row.days_of_cover),
    status: row.status,
    computed_at: row.computed_at,
    product_name: row.catalog_products?.name_ar ?? row.catalog_products?.name_en ?? null,
    warehouse_name: row.wh_warehouses?.name ?? null,
  }))
}

export async function updateSuggestionStatus(supabase: Client, id: string, status: string) {
  const { error } = await supabase
    .from('inv_reorder_suggestions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return { ok: true as const }
}
