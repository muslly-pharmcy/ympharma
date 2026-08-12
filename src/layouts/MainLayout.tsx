import type { ReactNode } from 'react'
import Navbar from '@/shared/components/Navbar'
import { Footer } from '@/shared/components/Footer'
import { FloatingMenu } from '@/shared/components/FloatingMenu'
import { useShopifyCartSync } from '@/hooks/useShopifyCartSync'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  useShopifyCartSync()

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-x safe-area-top">
      <Navbar />
      {/* pb keeps content clear of the mobile bottom nav + speed dial */}
      <main id="main-content" role="main" className="pt-16 pb-24 md:pb-0 flex-1">
        {children}
      </main>

      <Footer />
      <FloatingMenu />
    </div>
  )
}
