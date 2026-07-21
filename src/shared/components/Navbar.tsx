import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useAI } from '@/context/AIContext'
import { supabase } from '@/integrations/supabase/client'
import { listCart } from '@/lib/cart.functions'
import {
  Sun, Moon, Bell, MessageSquare, LogOut, Shield, LogIn,
  Stethoscope, Database, Search, ShoppingCart,
} from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { agents } = useAI()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const activeAgentsCount = agents.filter((a) => a.status === 'active').length

  const { data: cartItems } = useQuery({
    queryKey: ['cart', 'items'],
    queryFn: () => listCart(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
  const cartCount = cartItems?.reduce((n, it) => n + (it.quantity ?? 0), 0) ?? 0

  const displayName = (user?.user_metadata as { name?: string } | undefined)?.name ?? user?.email ?? ''
  const avatar =
    (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'guest'}`

  async function handleSignOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    await supabase.auth.signOut()
    await navigate({ to: '/auth', replace: true })
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 h-16 glass-panel border-b border-gray-200/50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-[1920px] mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-white text-xl font-bold">م</span>
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">MUSLLY AI OS</h1>
            <p className="text-xs text-gray-500">منصة التشغيل الصحية الوطنية</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            to="/medical-directory"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <Stethoscope className="w-4 h-4" />
            <span>الدليل الطبي</span>
          </Link>
          <Link
            to="/catalog"
            search={{ page: 1 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>الكتالوج</span>
          </Link>
          <Link
            to="/sbdma-import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>هيئة الأدوية</span>
          </Link>
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl ml-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-primary">{activeAgentsCount}</span> وكيل نشط
            </span>
          </div>
          <Link
            to="/mission-control"
            className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gold/10 rounded-xl hover:bg-gold/20 transition-colors"
          >
            <Shield className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">مركز القيادة</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="تبديل الوضع"
          >
            {isDark ? <Sun className="w-5 h-5 text-gold" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>

          {isAuthenticated ? (
            <>
              <Link to="/ai-chat" className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors relative" title="المحادثة الذكية">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-white text-[10px] rounded-full flex items-center justify-center font-bold">AI</span>
              </Link>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <img src={avatar} alt={displayName} className="w-8 h-8 rounded-lg object-cover" />
                  <span className="hidden md:block text-sm font-medium text-gray-700">{displayName}</span>
                </button>

                {showProfile && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-right"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
