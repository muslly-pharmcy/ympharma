import { createServerFn } from '@tanstack/react-start'
import type { Supplier } from '@/domain/suppliers/schemas'

const sel = (s: string): string => s

export const listSuppliers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Supplier[]> => {
    const { getPublicSupabase } = await import('./supabase-public.server')
    const supabase = getPublicSupabase()
    const { data, error } = await supabase
      .from('sup_suppliers')
      .select(sel('*'))
      .eq('status', 'active')
      .order('name')
    if (error) {
      console.error('[listSuppliers]', error)
      return []
    }
    return (data ?? []) as Supplier[]
  },
)
