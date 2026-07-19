import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useAI } from '@/context/AIContext'
import { Sun, Moon, Bell, MessageSquare, LogOut, User, Shield } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { agents } = useAI()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const activeAgentsCount = agents.filter(a => a.status === 'active').length

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 h-16 glass-panel border-b border-gray-200/50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-[1920px] mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <span className="text-white text-xl font-bold">م</span>
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">MUSLLY AI OS</h1>
            <p className="text-xs text-gray-500">منصة التشغيل الصحية الوطنية</p>
          </div>
        </Link>

        {/* Center - Active Agents */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-primary">{activeAgentsCount}</span> وكيل نشط
            </span>
          </div>
          <Link 
            to="/mission-control" 
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 rounded-xl hover:bg-gold/20 transition-colors"
          >
            <Shield className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">مركز القيادة</span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            title="تبديل الوضع"
          >
            {isDark ? <Sun className="w-5 h-5 text-gold" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>

          <Link
            to="/ai-chat"
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors relative"
            title="المحادثة الذكية"
          >
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              AI
            </span>
          </Link>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <img 
                src={user?.avatar || '/avatar.png'} 
                alt={user?.name} 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name}</span>
            </button>

            {showProfile && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-right"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
