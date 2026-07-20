import { createServerFn } from '@tanstack/react-start'
import {
  archiveProductInput,
  createProductInput,
  updateProductInput,
  type ArchiveProductInput,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/domain/catalog/commands'

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): CreateProductInput => createProductInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requireOrg } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    requireOrg(actor, data.organizationId)
    const correlation = data.correlationId ?? newCorrelationId('product')

    return withIdempotency(data.idempotencyKey, actor.userId, 'createProduct', async () => {
      const { data: row, error } = await supabaseAdmin
        .from('catalog_products')
        .insert({
          organization_id: data.organizationId,
          owner_org_id: data.organizationId,
          category_id: data.category_id ?? null,
          name_ar: data.name_ar,
          name_en: data.name_en ?? null,
          brand: data.brand ?? null,
          manufacturer: data.manufacturer ?? null,
          dosage_form: data.dosage_form ?? null,
          strength: data.strength ?? null,
          description_ar: data.description_ar ?? null,
          status: 'draft',
          created_by: actor.userId,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      await supabaseAdmin.rpc('emit_domain_event' as never, {
        p_event_type: 'ProductCreated',
        p_source: 'catalog-mutations',
        p_payload: { product_id: row.id, organization_id: data.organizationId } as unknown as never,
        p_priority: 'normal',
        p_correlation_id: correlation,
      })
      return { id: row.id, correlationId: correlation }
    })
  })

export const updateProduct = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): UpdateProductInput => updateProductInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { withIdempotency, newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('product')

    return withIdempotency(data.idempotencyKey, actor.userId, 'updateProduct', async () => {
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('catalog_products')
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
      const { error } = await supabaseAdmin
        .from('catalog_products')
        .update(patch as never)
        .eq('id', data.id)
      if (error) throw new Error(error.message)

      await supabaseAdmin.rpc('emit_domain_event' as never, {
        p_event_type: 'ProductUpdated',
        p_source: 'catalog-mutations',
        p_payload: { product_id: data.id, patch } as unknown as never,
        p_priority: 'normal',
        p_correlation_id: correlation,
      })
      return { id: data.id, correlationId: correlation }
    })
  })

export const archiveProduct = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown): ArchiveProductInput => archiveProductInput.parse(raw))
  .handler(async ({ data }) => {
    const { getActor } = await import('./session.server')
    const { newCorrelationId } = await import('./idempotency.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const actor = getActor()
    const correlation = data.correlationId ?? newCorrelationId('product')

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('catalog_products')
      .select('organization_id')
      .eq('id', data.id)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)
    if (existing.organization_id !== actor.organizationId) {
      throw new Error('Forbidden: cross-org archive')
    }

    const { error } = await supabaseAdmin
      .from('catalog_products')
      .update({ status: 'archived' })
      .eq('id', data.id)
    if (error) throw new Error(error.message)

    await supabaseAdmin.rpc('emit_domain_event' as never, {
      p_event_type: 'ProductArchived',
      p_source: 'catalog-mutations',
      p_payload: { product_id: data.id } as unknown as never,
      p_priority: 'normal',
      p_correlation_id: correlation,
    })
    return { id: data.id, correlationId: correlation }
  })
