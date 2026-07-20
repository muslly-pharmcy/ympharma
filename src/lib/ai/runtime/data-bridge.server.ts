// Read-only data bridge for AI features exposed to anonymous callers.
// Uses the publishable-key Supabase client — RLS applies as `anon`, and no
// write path is available from this module. Safe for public overlays.

export interface InventoryMatch {
  id: string
  name_ar: string
  brand: string | null
  barcode: string | null
  strength: string | null
  status: string
  requires_prescription: boolean
}


export interface InventoryContext {
  matches: InventoryMatch[]
  contextText: string
}

/**
 * Fetches up to `limit` catalog rows loosely matching `query` across
 * `name_ar`, `brand`, and `barcode`. Returns both a compact text block
 * suitable for RAG prompts and the raw matches for UI display.
 */
export async function fetchInventoryContext(
  query: string,
  limit = 5,
): Promise<InventoryContext> {
  const q = query.trim()
  if (!q) return { matches: [], contextText: 'لا يوجد استعلام.' }

  const { getPublicSupabase } = await import('@/lib/supabase-public.server')
  const supabase = getPublicSupabase()

  const like = `%${q.replace(/[%_]/g, '')}%`
  const { data, error } = await supabase
    .from('catalog_products')
    .select('id,name_ar,brand,barcode,strength,status,requires_prescription')
    .or(`name_ar.ilike.${like},brand.ilike.${like},barcode.ilike.${like}`)
    .eq('status', 'active')
    .limit(limit)

  if (error || !data) {
    return { matches: [], contextText: 'معلومات المنتجات غير متاحة حاليًا.' }
  }

  const matches = data as unknown as InventoryMatch[]
  const contextText =
    matches.length === 0
      ? 'لم يُعثر على منتجات مطابقة في الكاتالوج.'
      : matches
          .map(
            (p, i) =>
              `${i + 1}. ${p.name_ar}${p.brand ? ` — ${p.brand}` : ''}${
                p.strength ? ` (${p.strength})` : ''
              }${p.barcode ? ` [باركود: ${p.barcode}]` : ''}`,
          )
          .join('\n')

  return { matches, contextText }
}
