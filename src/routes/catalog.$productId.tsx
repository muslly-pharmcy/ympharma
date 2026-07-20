import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useQuery, queryOptions } from '@tanstack/react-query'
import { getProduct } from '@/lib/catalog.functions'
import { getStockSummary } from '@/lib/inventory.functions'
import { ArrowRight, Package } from 'lucide-react'

const productQuery = (id: string) =>
  queryOptions({
    queryKey: ['catalog', 'product', id],
    queryFn: () => getProduct({ data: { id } }),
  })

const stockQuery = (id: string) =>
  queryOptions({
    queryKey: ['inventory', 'stock-summary', id],
    queryFn: () => getStockSummary({ data: { productId: id } }),
  })

export const Route = createFileRoute('/catalog/$productId')({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.productId))
    if (!product) throw notFound()
    void context.queryClient.ensureQueryData(stockQuery(params.productId))
    return product
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name_ar} — MUSLLY AI OS` },
          {
            name: 'description',
            content:
              loaderData.product.description_ar ?? `تفاصيل ${loaderData.product.name_ar}`,
          },
        ]
      : [{ title: 'المنتج غير موجود' }],
  }),
  component: ProductDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-red-600">تعذر تحميل المنتج: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="mb-4">المنتج غير موجود.</p>
      <Link to="/catalog" className="text-primary underline">
        العودة للكتالوج
      </Link>
    </div>
  ),
})

function ProductDetail() {
  const params = Route.useParams()
  const { data } = useQuery(productQuery(params.productId))
  const { data: stock } = useQuery(stockQuery(params.productId))

  if (!data) return null
  const { product, barcodes, media } = data

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link to="/catalog" className="flex items-center gap-2 text-sm text-primary">
        <ArrowRight className="h-4 w-4" />
        العودة للكتالوج
      </Link>

      <header className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-primary/5">
            <Package className="h-16 w-16 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold">{product.name_ar}</h1>
            {product.name_en && <p className="text-sm text-muted-foreground">{product.name_en}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.brand && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {product.brand}
                </span>
              )}
              {product.manufacturer && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {product.manufacturer}
                </span>
              )}
              {product.dosage_form && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {product.dosage_form}
                </span>
              )}
              {product.strength && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {product.strength}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="المخزون" value={(stock?.totalOnHand ?? 0).toLocaleString('ar-EG')} />
        <Stat label="المحجوز" value={(stock?.totalReserved ?? 0).toLocaleString('ar-EG')} />
        <Stat label="الدُفعات" value={String(stock?.batches ?? 0)} />
      </section>

      {product.description_ar && (
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold">الوصف</h2>
          <p className="whitespace-pre-line text-sm text-gray-700">{product.description_ar}</p>
        </section>
      )}

      <section className="glass-panel rounded-2xl p-6">
        <h2 className="mb-3 text-lg font-semibold">الباركود</h2>
        {barcodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد باركود مسجّل.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {barcodes.map((b) => (
              <li key={b.id} className="font-mono">
                {b.barcode} {b.is_primary && <span className="text-xs text-primary">(أساسي)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6">
        <h2 className="mb-3 text-lg font-semibold">الوسائط</h2>
        <p className="text-sm text-muted-foreground">
          {media.length === 0
            ? 'لم يتم رفع صور بعد.'
            : `${media.length} ملف مرتبط بهذا المنتج.`}
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl p-5 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
