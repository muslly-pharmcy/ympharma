import type { ReactNode } from 'react'
import Navbar from '@/shared/components/Navbar'
import { Footer } from '@/shared/components/Footer'
import { FloatingContactButtons } from '@/shared/components/FloatingContactButtons'
import { useShopifyCartSync } from '@/hooks/useShopifyCartSync'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  useShopifyCartSync()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1">{children}</main>
      <Footer />
      <FloatingContactButtons />
    </div>
  )
}
