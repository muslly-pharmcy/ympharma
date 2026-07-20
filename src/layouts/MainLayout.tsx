import type { ReactNode } from 'react'
import Navbar from '@/shared/components/Navbar'

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
    </div>
  )
}
