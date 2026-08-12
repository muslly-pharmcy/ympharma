import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Home, Search, Upload, Stethoscope, ShoppingBag } from 'lucide-react'

interface MobileQuickNavProps {
  onUploadRx: () => void
  onSearch: () => void
}

/** Floating quick-access bar for mobile (RTL, dark-mode aware). */
export function MobileQuickNav({ onUploadRx, onSearch }: MobileQuickNavProps) {
  const item =
    'flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-bold text-foreground/80 transition hover:text-primary'

  return (
    <motion.nav
      dir="rtl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 22 }}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      aria-label="تنقّل سريع"
    >
      <div className="relative isolate flex items-center justify-around rounded-3xl border border-white/40 bg-white/80 px-2 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <span className="pointer-events-none absolute -top-6 left-1/2 -z-10 h-16 w-3/4 -translate-x-1/2 rounded-full bg-primary/25 blur-2xl" />

        <Link to="/" className={item}>
          <Home className="h-5 w-5" />
          الرئيسية
        </Link>
        <button type="button" onClick={onSearch} className={item}>
          <Search className="h-5 w-5" />
          بحث
        </button>
        <button
          type="button"
          onClick={onUploadRx}
          className="flex flex-col items-center gap-0.5 rounded-2xl bg-primary px-4 py-2 text-[10px] font-black text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Upload className="h-5 w-5" />
          وصفتي
        </button>
        <Link to="/shop" search={{ page: 1 }} className={item}>
          <ShoppingBag className="h-5 w-5" />
          المتجر
        </Link>
        <Link to="/contact" className={item}>
          <Stethoscope className="h-5 w-5" />
          استشارة
        </Link>
      </div>
    </motion.nav>
  )
}

export default MobileQuickNav
