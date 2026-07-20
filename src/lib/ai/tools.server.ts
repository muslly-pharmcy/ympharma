// AI Tool Registry — narrow, read-only tools invoked by agents.
// Each tool is server-only, org-scoped, and returns compact JSON-serializable data.
import type { Actor } from '../session.server'

export interface ToolContext {
  actor: Actor
}

export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: string
}

export type ToolExecutor = (ctx: ToolContext, input: Record<string, unknown>) => Promise<ToolResult>

export interface ToolDefinition {
  key: string
  description: string
  execute: ToolExecutor
}

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

const TOOLS: Record<string, ToolDefinition> = {
  search_products: {
    key: 'search_products',
    description: 'Search catalog products by name (case-insensitive). Input: { query: string }',
    execute: async ({ actor }, input) => {
      const q = String(input.query ?? '').trim()
      if (!q) return { ok: false, error: 'query is required' }
      const sb = await admin()
      const { data, error } = await sb
        .from('cat_products')
        .select('id, name, sku, active')
        .eq('organization_id', actor.organizationId)
        .ilike('name', `%${q}%`)
        .limit(15)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data }
    },
  },
  get_product_stock: {
    key: 'get_product_stock',
    description: 'Return on-hand stock per warehouse for a product. Input: { product_id: string }',
    execute: async ({ actor }, input) => {
      const pid = String(input.product_id ?? '').trim()
      if (!pid) return { ok: false, error: 'product_id is required' }
      const sb = await admin()
      const { data, error } = await sb
        .from('inv_stock_levels')
        .select('warehouse_id, quantity_on_hand, quantity_reserved')
        .eq('organization_id', actor.organizationId)
        .eq('product_id', pid)
        .limit(20)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data }
    },
  },
  list_low_stock: {
    key: 'list_low_stock',
    description: 'List products at or below reorder point. Input: { limit?: number }',
    execute: async ({ actor }, input) => {
      const limit = Math.min(Number(input.limit ?? 20), 50)
      const sb = await admin()
      const { data, error } = await sb
        .from('inv_stock_levels')
        .select('product_id, warehouse_id, quantity_on_hand, reorder_point')
        .eq('organization_id', actor.organizationId)
        .order('quantity_on_hand', { ascending: true })
        .limit(limit)
      if (error) return { ok: false, error: error.message }
      const low = (data ?? []).filter((r: { quantity_on_hand: number; reorder_point: number | null }) =>
        r.reorder_point != null && r.quantity_on_hand <= r.reorder_point,
      )
      return { ok: true, data: low }
    },
  },
  list_expiring_soon: {
    key: 'list_expiring_soon',
    description: 'List batches expiring within N days. Input: { days?: number }',
    execute: async ({ actor }, input) => {
      const days = Math.min(Math.max(Number(input.days ?? 60), 1), 365)
      const sb = await admin()
      const cutoff = new Date(Date.now() + days * 86400 * 1000).toISOString().slice(0, 10)
      const { data, error } = await sb
        .from('inv_batches')
        .select('id, product_id, lot_number, expiry_date, quantity_available')
        .eq('organization_id', actor.organizationId)
        .lte('expiry_date', cutoff)
        .gt('quantity_available', 0)
        .order('expiry_date', { ascending: true })
        .limit(50)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data }
    },
  },
  ops_snapshot: {
    key: 'ops_snapshot',
    description: 'Return a snapshot of open POs, active prescriptions, and pending claims for the org.',
    execute: async ({ actor }) => {
      const sb = await admin()
      const org = actor.organizationId
      const [po, rx, cl] = await Promise.all([
        sb.from('pur_purchase_orders').select('id,status', { count: 'exact', head: false })
          .eq('organization_id', org).in('status', ['draft', 'submitted', 'approved', 'received_partial']).limit(50),
        sb.from('hc_prescriptions').select('id,status', { count: 'exact', head: false })
          .eq('organization_id', org).in('status', ['submitted', 'validated', 'approved']).limit(50),
        sb.from('insv2_claims').select('id,status', { count: 'exact', head: false })
          .eq('organization_id', org).in('status', ['submitted', 'in_review']).limit(50),
      ])
      return {
        ok: true,
        data: {
          open_purchase_orders: po.data?.length ?? 0,
          active_prescriptions: rx.data?.length ?? 0,
          pending_claims: cl.data?.length ?? 0,
        },
      }
    },
  },
}

export function getTool(key: string): ToolDefinition | undefined {
  return TOOLS[key]
}

export function listTools(): ToolDefinition[] {
  return Object.values(TOOLS)
}
