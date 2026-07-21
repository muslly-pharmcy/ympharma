import { useEffect } from 'react'
import { useShopifyCartStore } from '@/stores/shopify-cart'

export function useShopifyCartSync() {
  const syncCart = useShopifyCartStore((state) => state.syncCart)

  useEffect(() => {
    void syncCart()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncCart()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncCart])
}
