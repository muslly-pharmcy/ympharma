import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Package, ArrowLeft } from 'lucide-react'
import { fetchShopifyProducts } from '@/lib/shopify/api'
import { ShopifyProductCard } from '@/components/shopify/ProductCard'
import { RouteSkeleton } from '@/components/skeletons/Skeleton'

export const Route = createFileRoute('/shop')({
  component: ShopPage,
})

function ShopPage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['shopify', 'products'],
    queryFn: () => fetchShopifyProducts(50),
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            متجر MUSLLY
          </h1>
          <p className="text-gray-600">
            منتجات صحية مختارة متوفرة للطلب المباشر
          </p>
        </div>

        <Suspense fallback={<RouteSkeleton />}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-2">تعذر تحميل المنتجات</p>
              <p className="text-sm text-gray-500">
                {(error as Error).message}
              </p>
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ShopifyProductCard key={product.node.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                لا توجد منتجات حالياً
              </h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                المتجر جديد ولم تتم إضافة منتجات بعد. أخبرني بالمنتجات التي
                تريد إضافتها مع الأسعار لأقوم بإنشائها في Shopify.
              </p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  )
}
