import type { ReactNode } from 'react'
import Navbar from '@/shared/components/Navbar'
import { useShopifyCartSync } from '@/hooks/useShopifyCartSync'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  useShopifyCartSync()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
    </div>
  )
}
