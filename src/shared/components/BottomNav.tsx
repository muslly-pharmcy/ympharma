import { Link, useRouterState } from '@tanstack/react-router'
import { Home, Pill, ClipboardList, BarChart3, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/prescriptions', label: 'الوصفات', icon: ClipboardList },
  { to: '/dispenses', label: 'الصرف', icon: Pill },
  { to: '/analytics', label: 'التحليلات', icon: BarChart3 },
  { to: '/customers', label: 'حسابي', icon: User },
] as const

/** Mobile-only bottom nav. Hidden on md+ and on unauthenticated routes. */
export function BottomNav() {
  const { location } = useRouterState()
  const path = location.pathname
  // hide on auth screens and marketing/landing splash
  if (path.startsWith('/auth') || path.startsWith('/reset-password')) return null
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="التنقل الرئيسي"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? path === '/' : path.startsWith(to)
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] ${
                  active ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
