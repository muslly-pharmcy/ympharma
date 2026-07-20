import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  createPurchaseOrderInput,
  purchaseOrderIdInput,
  updatePurchaseOrderInput,
  type CreatePurchaseOrderInput,
  type PurchaseOrderIdInput,
  type UpdatePurchaseOrderInput,
} from '@/domain/purchasing/commands'

// -------------------- reads --------------------

export const listPurchaseOrders = createServerFn({ method: 'GET' }).handler(async () => {
  const { getPublicSupabase } = await import('./supabase-public.server')
  const supabase = getPublicSupabase()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('id, code, status, supplier_id, warehouse_id, total_amount, currency, created_at, received_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[listPurchaseOrders]', error)
    return []
  }
  return data ?? []
})

export const getPurchaseOrder = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const [{ data: po, error: poErr }, { data: lines }] = await Promise.all([
      supabase.from('purchase_orders').select('*').eq('id', data.id).maybeSingle(),
      supabase.from('purchase_order_lines').select('*').eq('po_id', data.id).order('line_no'),
    ])
    if (poErr) throw new Error(poErr.message)
    if (!po) return null
    return { po, lines: lines ?? [] }
  })

// -------------------- writes --------------------

async function loadDeps() {
  const [{ getActor, requireOrg }, { withIdempotency, newCorrelationId }, { supabaseAdmin }] =
    await Promise.all([
      import('./session.server'),
      import('./idempotency.server'),
      import('@/integrations/supabase/client.server'),
    ])
  return { getActor, requireOrg, withIdempotency, newCorrelationId, supabaseAdmin }
}

export const createPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): CreatePurchaseOrderInput => createPurchaseOrderInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg, withIdempotency, newCorrelationId, supabaseAdmin } = await loadDeps()
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('po')

    return withIdempotency(data.idempotencyKey, actor.userId, 'createPurchaseOrder', async () => {
      const total = data.lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0)
      const { data: po, error } = await supabaseAdmin
        .from('purchase_orders')
        .insert({
          organization_id: data.organizationId,
          supplier_id: data.supplierId,
          warehouse_id: data.warehouseId,
          code: data.code,
          currency: data.currency,
          notes: data.notes ?? null,
          total_amount: total,
          status: 'draft',
          created_by: actor.userId,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      const lineRows = data.lines.map((l, idx) => ({
        po_id: po.id,
        product_id: l.product_id,
        line_no: idx + 1,
        qty_ordered: l.qty_ordered,
        unit_cost: l.unit_cost,
        batch_no: l.batch_no ?? null,
        expiry_date: l.expiry_date ?? null,
      }))
      const { error: linesErr } = await supabaseAdmin.from('purchase_order_lines').insert(lineRows)
      if (linesErr) {
        await supabaseAdmin.from('purchase_orders').delete().eq('id', po.id)
        throw new Error(linesErr.message)
      }

      await supabaseAdmin.rpc('emit_domain_event', {
        p_event_type: 'PurchaseOrderCreated',
        p_source: 'purchasing',
        p_payload: { po_id: po.id, lines: lineRows.length, total } as unknown as never,
        p_priority: 'normal',
        p_correlation_id: correlation,
      })
      return { id: po.id, correlationId: correlation }
    })
  })

export const updatePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): UpdatePurchaseOrderInput => updatePurchaseOrderInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, newCorrelationId, supabaseAdmin } = await loadDeps()
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('po')

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('purchase_orders')
      .select('organization_id, status')
      .eq('id', data.id)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)
    if (existing.organization_id !== actor.organizationId) throw new Error('Forbidden')
    if (existing.status !== 'draft') throw new Error('Only draft POs can be edited')

    const patch = Object.fromEntries(
      Object.entries(data.patch).filter(([, v]) => v !== undefined),
    )
    const { error } = await supabaseAdmin.from('purchase_orders').update(patch).eq('id', data.id)
    if (error) throw new Error(error.message)
    await supabaseAdmin.rpc('emit_domain_event', {
      p_event_type: 'PurchaseOrderUpdated',
      p_source: 'purchasing',
      p_payload: { po_id: data.id, patch } as unknown as never,
      p_priority: 'normal',
      p_correlation_id: correlation,
    })
    return { id: data.id, correlationId: correlation }
  })

async function transitionPO(
  data: PurchaseOrderIdInput,
  from: string[],
  to: 'submitted' | 'approved' | 'cancelled',
  event: string,
  extraColumns: Record<string, unknown> = {},
) {
  const { getActor, newCorrelationId, supabaseAdmin } = await loadDeps()
  const actor = getActor()
  const correlation = data.correlationId ?? newCorrelationId('po')

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('purchase_orders')
    .select('organization_id, status')
    .eq('id', data.id)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (existing.organization_id !== actor.organizationId) throw new Error('Forbidden')
  if (!from.includes(existing.status)) {
    throw new Error(`Cannot transition to ${to} from ${existing.status}`)
  }
  const { error } = await supabaseAdmin
    .from('purchase_orders')
    .update({ status: to, ...extraColumns })
    .eq('id', data.id)
  if (error) throw new Error(error.message)

  await supabaseAdmin.rpc('emit_domain_event', {
    p_event_type: event,
    p_source: 'purchasing',
    p_payload: { po_id: data.id } as unknown as never,
    p_priority: 'normal',
    p_correlation_id: correlation,
  })
  return { id: data.id, correlationId: correlation }
}

export const submitPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): PurchaseOrderIdInput => purchaseOrderIdInput.parse(raw))
  .handler(async ({ data }) => transitionPO(data, ['draft'], 'submitted', 'PurchaseOrderSubmitted'))

export const approvePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): PurchaseOrderIdInput => purchaseOrderIdInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const actor = getActor()
    return transitionPO(data, ['submitted'], 'approved', 'PurchaseOrderApproved', {
      approved_by: actor.userId,
      approved_at: new Date().toISOString(),
    })
  })

export const cancelPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): PurchaseOrderIdInput => purchaseOrderIdInput.parse(raw))
  .handler(async ({ data }) =>
    transitionPO(data, ['draft', 'submitted', 'approved'], 'cancelled', 'PurchaseOrderCancelled'),
  )

export const receivePurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): PurchaseOrderIdInput => purchaseOrderIdInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, newCorrelationId, supabaseAdmin } = await loadDeps()
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('po')
    const { error } = await supabaseAdmin.rpc('po_receive', {
      p_po: data.id,
      p_actor: actor.userId,
      p_correlation: correlation,
    })
    if (error) throw new Error(error.message)
    return { id: data.id, correlationId: correlation }
  })
