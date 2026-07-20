import { createServerFn } from '@tanstack/react-start'
import {
  adjustStockInput,
  createWarehouseInput,
  receiveStockInput,
  reservationIdInput,
  reserveStockInput,
  returnStockInput,
  transferStockInput,
  updateWarehouseInput,
  type AdjustStockInput,
  type CreateWarehouseInput,
  type ReceiveStockInput,
  type ReservationIdInput,
  type ReserveStockInput,
  type ReturnStockInput,
  type TransferStockInput,
  type UpdateWarehouseInput,
} from '@/domain/inventory/commands'

// -------------------------- warehouses --------------------------

export const createWarehouse = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): CreateWarehouseInput => createWarehouseInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('warehouse')

    return withIdempotency(data.idempotencyKey, actor.userId, 'createWarehouse', async () => {
      const { data: row, error } = await supabaseAdmin
        .from('wh_warehouses')
        .insert({
          organization_id: data.organizationId,
          branch_id: data.branch_id ?? null,
          code: data.code,
          name: data.name,
          kind: data.kind,
          address: data.address ?? null,
          is_active: true,
          created_by: actor.userId,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      await supabaseAdmin.rpc('emit_domain_event', {
        p_event_type: 'WarehouseCreated',
        p_source: 'inventory-mutations',
        p_payload: { warehouse_id: row.id, organization_id: data.organizationId } as unknown as never,
        p_priority: 'normal',
        p_correlation_id: correlation,
      })
      return { id: row.id, correlationId: correlation }
    })
  })

export const updateWarehouse = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): UpdateWarehouseInput => updateWarehouseInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('warehouse')

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('wh_warehouses')
      .select('organization_id')
      .eq('id', data.id)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)
    if (existing.organization_id !== actor.organizationId) {
      throw new Error('Forbidden: cross-org update')
    }
    const patch = Object.fromEntries(
      Object.entries(data.patch).filter(([, v]) => v !== undefined),
    )
    const { error } = await supabaseAdmin.from('wh_warehouses').update(patch as never).eq('id', data.id)
    if (error) throw new Error(error.message)

    await supabaseAdmin.rpc('emit_domain_event', {
      p_event_type: 'WarehouseUpdated',
      p_source: 'inventory-mutations',
      p_payload: { warehouse_id: data.id, patch } as unknown as never,
      p_priority: 'normal',
      p_correlation_id: correlation,
    })
    return { id: data.id, correlationId: correlation }
  })

// -------------------------- stock transactions --------------------------

export const receiveStock = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ReceiveStockInput => receiveStockInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('receive')

    return withIdempotency(data.idempotencyKey, actor.userId, 'receiveStock', async () => {
      const { data: batchId, error } = await supabaseAdmin.rpc('inv_receive_stock' as never, {
        p_org: data.organizationId,
        p_warehouse: data.warehouseId,
        p_product: data.productId,
        p_supplier: data.supplierId ?? null,
        p_qty: data.qty,
        p_cost: data.cost,
        p_batch: data.batchNo ?? null,
        p_expiry: data.expiry ?? null,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { batchId: batchId as unknown as string, correlationId: correlation }
    })
  })

export const adjustStock = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): AdjustStockInput => adjustStockInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('adjust')

    return withIdempotency(data.idempotencyKey, actor.userId, 'adjustStock', async () => {
      const { data: movementId, error } = await supabaseAdmin.rpc('inv_adjust_stock' as never, {
        p_batch: data.batchId,
        p_delta: data.delta,
        p_reason: data.reason,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { movementId: movementId as unknown as string, correlationId: correlation }
    })
  })

export const transferStock = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): TransferStockInput => transferStockInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('transfer')

    return withIdempotency(data.idempotencyKey, actor.userId, 'transferStock', async () => {
      const { data: transferId, error } = await supabaseAdmin.rpc('inv_transfer_stock' as never, {
        p_org: data.organizationId,
        p_from_warehouse: data.fromWarehouseId,
        p_to_warehouse: data.toWarehouseId,
        p_product: data.productId,
        p_qty: data.qty,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { transferId: transferId as unknown as string, correlationId: correlation }
    })
  })

export const reserveStock = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ReserveStockInput => reserveStockInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('reserve')

    return withIdempotency(data.idempotencyKey, actor.userId, 'reserveStock', async () => {
      const { data: reservationId, error } = await supabaseAdmin.rpc('inv_reserve_fefo' as never, {
        p_org: data.organizationId,
        p_product: data.productId,
        p_qty: data.qty,
        p_ref_type: data.refType ?? null,
        p_ref_id: data.refId ?? null,
        p_actor: actor.userId,
        p_correlation: correlation,
        p_allow_partial: data.allowPartial,
      })
      if (error) throw new Error(error.message)
      return { reservationId: reservationId as unknown as string, correlationId: correlation }
    })
  })

export const releaseReservation = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ReservationIdInput => reservationIdInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('release')

    return withIdempotency(data.idempotencyKey, actor.userId, 'releaseReservation', async () => {
      const { error } = await supabaseAdmin.rpc('inv_release_reservation' as never, {
        p_reservation: data.reservationId,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { reservationId: data.reservationId, correlationId: correlation }
    })
  })

export const consumeReservation = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ReservationIdInput => reservationIdInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('consume')

    return withIdempotency(data.idempotencyKey, actor.userId, 'consumeReservation', async () => {
      const { error } = await supabaseAdmin.rpc('inv_consume_reservation' as never, {
        p_reservation: data.reservationId,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { reservationId: data.reservationId, correlationId: correlation }
    })
  })

export const returnStock = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ReturnStockInput => returnStockInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('return')

    return withIdempotency(data.idempotencyKey, actor.userId, 'returnStock', async () => {
      const { data: batchId, error } = await supabaseAdmin.rpc('inv_return_stock' as never, {
        p_org: data.organizationId,
        p_warehouse: data.warehouseId,
        p_product: data.productId,
        p_qty: data.qty,
        p_reason: data.reason ?? null,
        p_actor: actor.userId,
        p_correlation: correlation,
      })
      if (error) throw new Error(error.message)
      return { batchId: batchId as unknown as string, correlationId: correlation }
    })
  })
