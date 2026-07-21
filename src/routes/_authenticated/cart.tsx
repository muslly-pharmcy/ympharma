import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ShoppingCart, Trash2, Plus, Minus, Lock } from 'lucide-react'
import { listCart, removeFromCart, setCartQuantity } from '@/lib/cart.functions'

export const Route = createFileRoute('/_authenticated/cart')({
  head: () => ({
    meta: [
      { title: 'السلة — صيدلية المصلي' },
      { name: 'description', content: 'مراجعة الأصناف OTC في سلة التسوق قبل الطلب.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: CartPage,
})

function CartPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart', 'items'],
    queryFn: () => listCart(),
  })
  const qc = useQueryClient()
  const removeFn = useServerFn(removeFromCart)
  const setQtyFn = useServerFn(setCartQuantity)

  const remove = useMutation({
    mutationFn: (itemId: string) => removeFn({ data: { itemId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })
  const setQty = useMutation({
    mutationFn: (v: { itemId: string; quantity: number }) => setQtyFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8" dir="rtl">
      <header className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">سلة التسوق</h1>
        <span className="text-sm text-gray-500">({items.length} صنف)</span>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-600 mb-4">السلة فارغة حالياً.</p>
          <Link to="/catalog" search={{ q: '', page: 1 }} className="inline-block px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
            تصفح الكتالوج
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const restricted = it.product?.requires_prescription
            return (
              <li
                key={it.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {it.product?.name_ar ?? '—'}
                    </p>
                    {restricted && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> يتطلب وصفة
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {[it.product?.brand, it.product?.strength].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    aria-label="تقليل"
                    disabled={setQty.isPending || it.quantity <= 1}
                    onClick={() => setQty.mutate({ itemId: it.id, quantity: it.quantity - 1 })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{it.quantity}</span>
                  <button
                    aria-label="زيادة"
                    disabled={setQty.isPending || it.quantity >= 99}
                    onClick={() => setQty.mutate({ itemId: it.id, quantity: it.quantity + 1 })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  aria-label="حذف"
                  onClick={() => remove.mutate(it.id)}
                  disabled={remove.isPending}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
