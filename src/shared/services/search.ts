import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/services/supabase'
import { useDebounce } from '@/shared/hooks/useDebounce'

export interface SearchResult {
  id: string
  type: 'product' | 'doctor' | 'hospital' | 'patient' | 'order' | 'prescription'
  title: string
  subtitle: string
  url: string
  relevance: number
}

export class SearchEngine {
  private cache: Map<string, SearchResult[]>
  private cacheExpiry: Map<string, number>
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.cache = new Map()
    this.cacheExpiry = new Map()
  }

  async search(query: string, filters?: { type?: string; branchId?: string }): Promise<SearchResult[]> {
    if (!query.trim()) return []

    const cacheKey = `${query}_${JSON.stringify(filters)}`

    // Check cache
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0
      if (Date.now() < expiry) {
        return this.cache.get(cacheKey) || []
      }
    }

    const results: SearchResult[] = []
    const searchTerm = `%${query}%`

    // Search products
    const { data: products } = await supabase
      .from('products')
      .select('id, name_ar, name, category, barcode')
      .or(`name_ar.ilike.${searchTerm},name.ilike.${searchTerm},barcode.ilike.${searchTerm},active_ingredient.ilike.${searchTerm}`)
      .eq('is_active', true)
      .limit(10)

    products?.forEach(p => {
      results.push({
        id: p.id,
        type: 'product',
        title: p.name_ar,
        subtitle: `${p.name} • ${p.category} • ${p.barcode || ''}`,
        url: `/planet/pharmacy?product=${p.id}`,
        relevance: this.calculateRelevance(query, p.name_ar + p.name + p.barcode),
      })
    })

    // Search doctors
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, name_ar, specialty, phone')
      .or(`name_ar.ilike.${searchTerm},specialty.ilike.${searchTerm}`)
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(10)

    doctors?.forEach(d => {
      results.push({
        id: d.id,
        type: 'doctor',
        title: d.name_ar,
        subtitle: d.specialty,
        url: `/planet/doctors?doctor=${d.id}`,
        relevance: this.calculateRelevance(query, d.name_ar + d.specialty),
      })
    })

    // Search hospitals
    const { data: hospitals } = await supabase
      .from('hospitals')
      .select('id, name_ar, type, address')
      .or(`name_ar.ilike.${searchTerm},address.ilike.${searchTerm}`)
      .eq('is_active', true)
      .limit(10)

    hospitals?.forEach(h => {
      results.push({
        id: h.id,
        type: 'hospital',
        title: h.name_ar,
        subtitle: h.address,
        url: `/planet/hospitals?hospital=${h.id}`,
        relevance: this.calculateRelevance(query, h.name_ar + h.address),
      })
    })

    // Search patients
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name_ar, name, phone')
      .or(`name_ar.ilike.${searchTerm},name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .limit(10)

    patients?.forEach(p => {
      results.push({
        id: p.id,
        type: 'patient',
        title: p.name_ar || p.name,
        subtitle: p.phone || '',
        url: `/planet/patients?patient=${p.id}`,
        relevance: this.calculateRelevance(query, (p.name_ar || '') + p.name + p.phone),
      })
    })

    // Search orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, grand_total')
      .ilike('id', searchTerm)
      .limit(10)

    orders?.forEach(o => {
      results.push({
        id: o.id,
        type: 'order',
        title: `طلب #${o.id.slice(0, 8)}`,
        subtitle: `${o.status} • ${o.grand_total} ر.ي`,
        url: `/planet/pharmacy?order=${o.id}`,
        relevance: this.calculateRelevance(query, o.id),
      })
    })

    // Sort by relevance
    const sorted = results.sort((a, b) => b.relevance - a.relevance)

    // Cache results
    this.cache.set(cacheKey, sorted)
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL)

    return sorted
  }

  private calculateRelevance(query: string, text: string): number {
    const lowerQuery = query.toLowerCase()
    const lowerText = text.toLowerCase()

    if (lowerText.startsWith(lowerQuery)) return 1.0
    if (lowerText.includes(` ${lowerQuery}`)) return 0.9
    if (lowerText.includes(lowerQuery)) return 0.7
    return 0.5
  }

  clearCache() {
    this.cache.clear()
    this.cacheExpiry.clear()
  }
}

export const searchEngine = new SearchEngine()

// React Hook for search
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    searchEngine.search(debouncedQuery).then(results => {
      setResults(results)
      setLoading(false)
    })
  }, [debouncedQuery])

  return { results, loading }
}
