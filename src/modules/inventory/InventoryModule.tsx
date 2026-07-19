import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, AlertTriangle, Calendar, BarChart3, Search } from 'lucide-react'
import { supabase } from '@/shared/services/supabase'
import type { Product, InventoryItem } from '@/types'

export function InventoryModule() {
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'expired'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventoryData()
  }, [filter])

  const fetchInventoryData = async () => {
    setLoading(true)

    let productQuery = supabase.from('products').select('*').eq('is_active', true)

    if (filter === 'low') {
      productQuery = productQuery.lte('stock', 'min_stock')
    }

    const { data: productsData } = await productQuery
    if (productsData) setProducts(productsData as Product[])

    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('*')
      .order('expiry_date', { ascending: true })
      .limit(100)

    if (inventoryData) setInventory(inventoryData as InventoryItem[])

    setLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.nameAr.includes(searchQuery) || 
    p.barcode?.includes(searchQuery) ||
    p.sku?.includes(searchQuery)
  )

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length
  const expiredCount = inventory.filter(i => new Date(i.expiryDate) < new Date()).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-xs text-gray-500">إجمالي المنتجات</p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
              <p className="text-xs text-gray-500">مخزون منخفض</p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
              <p className="text-xs text-gray-500">منتهي الصلاحية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'low', 'expired'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'الكل' : f === 'low' ? 'منخفض' : 'منتهي'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl p-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المنتج</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الباركود</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المخزون</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الحد الأدنى</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, i) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{product.nameAr}</p>
                    <p className="text-xs text-gray-500">{product.name}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{product.barcode}</td>
                <td className="py-3 px-4">
                  <span className={`font-bold ${
                    product.stock <= product.minStock ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {product.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{product.minStock}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.stock <= product.minStock
                      ? 'bg-red-50 text-red-600'
                      : product.stock <= product.minStock * 2
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-green-50 text-green-600'
                  }`}>
                    {product.stock <= product.minStock ? 'منخفض' : product.stock <= product.minStock * 2 ? 'متوسط' : 'متوفر'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
