import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
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
  const { data: items = [] } = useQuery({
    queryKey: ['cart', 'items'],
    queryFn: () => listCart(),
    // Keep data in memory long enough to survive brief offline periods.
    gcTime: 30 * 60_000,
    staleTime: 60_000,
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

  const hasRestricted = items.some((it) => it.product?.requires_prescription)
  const canCheckout = items.length > 0 && !hasRestricted
  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + Number(it.product?.sbdma_official_price ?? 0) * it.quantity,
        0,
      ),
    [items],
  )

  return (
    <div className="mx-auto max-w-4xl p-3 pt-20 sm:p-6 sm:pt-24 md:p-8" dir="rtl">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <ShoppingCart className="h-6 w-6 shrink-0 text-primary" />
        <h1 className="min-w-0 truncate text-xl font-bold text-gray-900 sm:text-2xl">
          سلة التسوق
        </h1>
        <span className="text-sm text-gray-500">({items.length} صنف)</span>
        <Link to="/orders" className="mr-auto text-sm text-primary hover:underline">
          طلباتي ←
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="mb-4 text-gray-600">السلة فارغة حالياً.</p>
          <Link
            to="/shop"
            search={{ page: 1 }}
            className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            تصفح المتجر
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((it) => {
              const restricted = it.product?.requires_prescription
              const unit = Number(it.product?.sbdma_official_price ?? 0)
              const line = unit * it.quantity
              return (
                <li
                  key={it.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"
                >
                  {/* Product info */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-gray-900 sm:text-base">
                        {it.product?.name_ar ?? '—'}
                      </p>
                      {restricted && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                          <Lock className="h-3 w-3" /> وصفة
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {[it.product?.brand, it.product?.strength].filter(Boolean).join(' · ') ||
                        '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {unit.toLocaleString('ar-EG')} ر.ي / وحدة
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    aria-label="حذف"
                    onClick={() => remove.mutate(it.id)}
                    disabled={remove.isPending}
                    className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Qty controls + line total (spans both cols) */}
                  <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-0.5">
                      <button
                        aria-label="تقليل"
                        disabled={setQty.isPending || it.quantity <= 1}
                        onClick={() =>
                          setQty.mutate({ itemId: it.id, quantity: it.quantity - 1 })
                        }
                        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{it.quantity}</span>
                      <button
                        aria-label="زيادة"
                        disabled={setQty.isPending || it.quantity >= 99}
                        onClick={() =>
                          setQty.mutate({ itemId: it.id, quantity: it.quantity + 1 })
                        }
                        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {line.toLocaleString('ar-EG')} ر.ي
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {hasRestricted && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              لديك أصناف تتطلب وصفة طبية — أزلها من السلة قبل إتمام الطلب.
            </p>
          )}

          {/* Sticky mobile checkout bar */}
          <div className="sticky bottom-16 z-30 mt-6 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg sm:static sm:mt-8 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="mb-3 flex items-center justify-between sm:mb-0">
              <span className="text-sm text-gray-600">المجموع الجزئي</span>
              <span className="text-lg font-bold text-primary sm:mr-3">
                {subtotal.toLocaleString('ar-EG')} ر.ي
              </span>
            </div>
            <Link
              to="/checkout"
              aria-disabled={!canCheckout}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm sm:w-auto ${
                canCheckout
                  ? 'bg-primary hover:opacity-90'
                  : 'pointer-events-none bg-gray-300'
              }`}
            >
              متابعة إلى الدفع
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
