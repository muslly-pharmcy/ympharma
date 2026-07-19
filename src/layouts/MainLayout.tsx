import { Outlet } from 'react-router-dom'
import Navbar from '@/shared/components/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
