import { Link } from '@tanstack/react-router'
import { ShoppingCart, Loader2 } from 'lucide-react'
import type { ShopifyProduct } from '@/lib/shopify/api'
import { useShopifyCartStore } from '@/stores/shopify-cart'

interface ProductCardProps {
  product: ShopifyProduct
}

export function ShopifyProductCard({ product }: ProductCardProps) {
  const { node } = product
  const variant = node.variants.edges[0]?.node
  const image = node.images.edges[0]?.node
  const addItem = useShopifyCartStore((state) => state.addItem)
  const isLoading = useShopifyCartStore((state) => state.isLoading)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!variant) return
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    })
  }

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <Link to="/product/$handle" params={{ handle: node.handle }} className="block">
        <div className="aspect-square overflow-hidden bg-gray-50">
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? node.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12" />
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4">
        <Link to="/product/$handle" params={{ handle: node.handle }}>
          <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {node.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">
          {node.description || 'لا يوجد وصف'}
        </p>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="font-bold text-primary">
            {node.priceRange.minVariantPrice.currencyCode}{' '}
            {parseFloat(node.priceRange.minVariantPrice.amount).toFixed(2)}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isLoading || !variant?.availableForSale}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>أضف</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
