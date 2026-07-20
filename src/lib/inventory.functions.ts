import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StockBatch, StockSummary, Warehouse } from '@/domain/inventory/schemas'

const sel = (s: string): string => s

// Warehouse and batch tables are org-scoped (RLS: is_org_member).
// The publishable/anon key has no membership, so anon reads return [].
// These server fns return empty arrays gracefully for now; Shipment B will
// switch to requireSupabaseAuth once real Supabase Auth is wired in.

export const listWarehouses = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Warehouse[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data, error } = await supabase
      .from('wh_warehouses')
      .select(sel('*'))
      .eq('is_active', true)
      .order('name')
    if (error) {
      console.error('[listWarehouses]', error)
      return []
    }
    return (data ?? []) as unknown as Warehouse[]
  },
)

export const getStockSummary = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<StockSummary> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data: batches, error } = await supabase
      .from('inv_stock_batches')
      .select(sel('qty_on_hand,qty_reserved,expiry_date'))
      .eq('product_id', data.productId)

    if (error || !batches) {
      return {
        productId: data.productId,
        totalOnHand: 0,
        totalReserved: 0,
        batches: 0,
        nearestExpiry: null,
      }
    }

    const rows = batches as Array<Pick<StockBatch, 'qty_on_hand' | 'qty_reserved' | 'expiry_date'>>
    const totalOnHand = rows.reduce((s, b) => s + Number(b.qty_on_hand ?? 0), 0)
    const totalReserved = rows.reduce((s, b) => s + Number(b.qty_reserved ?? 0), 0)
    const expiries = rows
      .map((b) => b.expiry_date)
      .filter((d): d is string => !!d)
      .sort()
    return {
      productId: data.productId,
      totalOnHand,
      totalReserved,
      batches: rows.length,
      nearestExpiry: expiries[0] ?? null,
    }
  })
