import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  listProductsInputSchema,
  type CatalogCategory,
  type CatalogProduct,
  type ListProductsResult,
} from '@/domain/catalog/schemas'

// Escape PostgREST `.or()` reserved chars in user search input.
function escOr(v: string): string {
  return v.replace(/[,()*"']/g, ' ').trim()
}

const sel = (s: string): string => s

export const listProducts = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) => listProductsInputSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<ListProductsResult> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()

    const from = (data.page - 1) * data.pageSize
    const to = from + data.pageSize - 1

    let q = supabase
      .from('catalog_products')
      .select(sel('*'), { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to)

    // Public policy: is_public AND status='approved'. Enforce here too so we
    // don't accidentally rely only on RLS.
    if (data.publicOnly) {
      q = q.eq('is_public', true).eq('status', 'approved')
    }
    if (data.categoryId) q = q.eq('category_id', data.categoryId)
    if (data.search) {
      const term = `%${escOr(data.search)}%`
      q = q.or(
        `name_ar.ilike.${term},name_en.ilike.${term},generic_name.ilike.${term},brand.ilike.${term},barcode.ilike.${term}`,
      )
    }

    const { data: rows, error, count } = await q
    if (error) {
      console.error('[listProducts]', error)
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    return {
      items: (rows ?? []) as unknown as CatalogProduct[],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    }
  })

export const getProduct = createServerFn({ method: 'GET' })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()

    const { data: product, error } = await supabase
      .from('catalog_products')
      .select(sel('*'))
      .eq('id', data.id)
      .maybeSingle()

    if (error || !product) return null

    const [{ data: barcodes }, { data: media }] = await Promise.all([
      supabase.from('catalog_barcodes').select(sel('*')).eq('product_id', data.id),
      supabase
        .from('catalog_product_media')
        .select(sel('*'))
        .eq('product_id', data.id)
        .order('sort_order', { ascending: true }),
    ])

    return {
      product: product as unknown as CatalogProduct,
      barcodes: barcodes ?? [],
      media: media ?? [],
    }
  })

export const listCategories = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CatalogCategory[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data, error } = await supabase
      .from('catalog_categories')
      .select(sel('*'))
      .is('organization_id', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('[listCategories]', error)
      return []
    }
    return (data ?? []) as unknown as CatalogCategory[]
  },
)
