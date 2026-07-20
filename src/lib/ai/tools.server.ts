// AI Tool Registry — narrow, read-only tools invoked by agents.
// Each tool is server-only, org-scoped, and returns compact JSON-serializable data.
// Table types for our newly created domain tables aren't in the generated
// Supabase types yet, so we cast the admin client through `any` here.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any
}

const TOOLS: Record<string, ToolDefinition> = {
  search_products: {
    key: 'search_products',
    description: 'Search catalog products by name. Input: { query: string }',
    execute: async ({ actor }, input) => {
      const q = String(input.query ?? '').trim()
      if (!q) return { ok: false, error: 'query is required' }
      const sb = await admin()
      const { data, error } = await sb
        .from('catalog_products')
        .select('id, name, sku, status')
        .eq('organization_id', actor.organizationId)
        .ilike('name', `%${q}%`)
        .limit(15)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data }
    },
  },
  get_product_stock: {
    key: 'get_product_stock',
    description: 'Return on-hand stock per batch for a product. Input: { product_id: string }',
    execute: async ({ actor }, input) => {
      const pid = String(input.product_id ?? '').trim()
      if (!pid) return { ok: false, error: 'product_id is required' }
      const sb = await admin()
      const { data, error } = await sb
        .from('inv_stock_batches')
        .select('warehouse_id, qty_on_hand, qty_reserved, expiry_date')
        .eq('organization_id', actor.organizationId)
        .eq('product_id', pid)
        .gt('qty_on_hand', 0)
        .order('expiry_date', { ascending: true })
        .limit(20)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data }
    },
  },
  list_low_stock: {
    key: 'list_low_stock',
    description: 'List products whose total on-hand is at or below a threshold. Input: { threshold?: number }',
    execute: async ({ actor }, input) => {
      const threshold = Math.max(Number(input.threshold ?? 10), 0)
      const sb = await admin()
      const { data, error } = await sb
        .from('inv_stock_batches')
        .select('product_id, qty_on_hand')
        .eq('organization_id', actor.organizationId)
      if (error) return { ok: false, error: error.message }
      const totals = new Map<string, number>()
      for (const r of (data ?? []) as Array<{ product_id: string; qty_on_hand: number }>) {
        totals.set(r.product_id, (totals.get(r.product_id) ?? 0) + Number(r.qty_on_hand ?? 0))
      }
      const low = Array.from(totals.entries())
        .filter(([, q]) => q <= threshold)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 25)
        .map(([product_id, total_on_hand]) => ({ product_id, total_on_hand }))
      return { ok: true, data: { threshold, count: low.length, items: low } }
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
        .from('inv_stock_batches')
        .select('id, product_id, batch_number, expiry_date, qty_on_hand')
        .eq('organization_id', actor.organizationId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', cutoff)
        .gt('qty_on_hand', 0)
        .order('expiry_date', { ascending: true })
        .limit(50)
      if (error) return { ok: false, error: error.message }
      return { ok: true, data: { horizon_days: days, count: (data ?? []).length, items: data } }
    },
  },
  ops_snapshot: {
    key: 'ops_snapshot',
    description: 'Snapshot of open POs, active prescriptions, and pending claims for the org.',
    execute: async ({ actor }) => {
      const sb = await admin()
      const org = actor.organizationId
      const [po, rx, cl] = await Promise.all([
        sb.from('purchase_orders').select('id, status')
          .eq('organization_id', org)
          .in('status', ['draft', 'submitted', 'approved', 'received_partial']).limit(100),
        sb.from('hc_prescriptions').select('id, status')
          .eq('organization_id', org)
          .in('status', ['submitted', 'validated', 'approved']).limit(100),
        sb.from('insv2_claims').select('id, status')
          .eq('organization_id', org)
          .in('status', ['submitted', 'in_review']).limit(100),
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
  get_loyalty_balance: {
    key: 'get_loyalty_balance',
    description: 'Return current loyalty balance/tier for a customer. Input: { customer_id: string }',
    execute: async ({ actor }, input) => {
      const cid = String(input.customer_id ?? '').trim()
      if (!cid) return { ok: false, error: 'customer_id is required' }
      const { hasPermission } = await import('../session.server')
      if (!hasPermission(actor, 'ai.loyalty.read')) return { ok: false, error: 'permission denied' }
      const sb = await admin()
      const { data } = await sb.from('crm_loyalty_accounts')
        .select('id, points_balance, points_lifetime_earned, status, tier:crm_loyalty_tiers(name, multiplier)')
        .eq('organization_id', actor.organizationId).eq('customer_id', cid).maybeSingle()
      return { ok: true, data: data ?? null }
    },
  },
  customer_loyalty_history: {
    key: 'customer_loyalty_history',
    description: 'Return recent loyalty ledger entries for a customer. Input: { customer_id: string, limit?: number }',
    execute: async ({ actor }, input) => {
      const cid = String(input.customer_id ?? '').trim()
      if (!cid) return { ok: false, error: 'customer_id is required' }
      const { hasPermission } = await import('../session.server')
      if (!hasPermission(actor, 'ai.loyalty.read')) return { ok: false, error: 'permission denied' }
      const limit = Math.min(Math.max(Number(input.limit ?? 20), 1), 100)
      const sb = await admin()
      const { data } = await sb.from('crm_loyalty_transactions')
        .select('id, kind, points, reason, created_at')
        .eq('organization_id', actor.organizationId).eq('customer_id', cid)
        .order('created_at', { ascending: false }).limit(limit)
      return { ok: true, data: data ?? [] }
    },
  },
  suggest_rewards: {
    key: 'suggest_rewards',
    description: 'Suggest rewards the customer can afford right now. Input: { customer_id: string }',
    execute: async ({ actor }, input) => {
      const cid = String(input.customer_id ?? '').trim()
      if (!cid) return { ok: false, error: 'customer_id is required' }
      const { hasPermission } = await import('../session.server')
      if (!hasPermission(actor, 'ai.loyalty.read')) return { ok: false, error: 'permission denied' }
      const sb = await admin()
      const { data: acc } = await sb.from('crm_loyalty_accounts')
        .select('points_balance').eq('organization_id', actor.organizationId).eq('customer_id', cid).maybeSingle()
      const balance = Number(acc?.points_balance ?? 0)
      const { data: rewards } = await sb.from('crm_reward_catalog')
        .select('id, code, name, points_cost, stock')
        .eq('organization_id', actor.organizationId).eq('is_active', true)
        .lte('points_cost', balance).order('points_cost', { ascending: false }).limit(10)
      return { ok: true, data: { balance, suggestions: rewards ?? [] } }
    },
  },
}

export function getTool(key: string): ToolDefinition | undefined {
  return TOOLS[key]
}

export function listTools(): ToolDefinition[] {
  return Object.values(TOOLS)
}
