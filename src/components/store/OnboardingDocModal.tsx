import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, HeartPulse, Zap, Dna, Truck } from 'lucide-react'

const STORAGE_KEY = 'muslly.onboarding.v1'

const HIGHLIGHTS = [
  {
    icon: HeartPulse,
    emoji: '🏥',
    title: 'المنصة الطبية الذكية',
    body: 'صيدلية إلكترونية معتمدة توفر استشارات طبية فورية وأدوات صحية تفاعلية.',
  },
  {
    icon: Zap,
    emoji: '⚡',
    title: 'طلب سريع عبر الواتساب',
    body: 'إمكانية إرسال السلة والوصفات الطبية بنقرة واحدة مباشرة للواتساب.',
  },
  {
    icon: Dna,
    emoji: '🧬',
    title: 'دقة وشخصنة المحتوى',
    body: 'وصف دواعي الاستخدام والجرعات بدقة عالية لكل منتج.',
  },
  {
    icon: Truck,
    emoji: '🚚',
    title: 'توصيل سريع وآمن',
    body: 'خدمة توصيل موثوقة وحفظ متكامل للأدوية.',
  },
] as const

/**
 * First-visit welcome document. Purely client-side (localStorage flag) —
 * no visitor registration, profiling, or network calls.
 */
export function OnboardingDocModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        const t = window.setTimeout(() => setOpen(true), 600)
        return () => window.clearTimeout(t)
      }
    } catch {
      /* storage blocked — stay silent */
    }
    return undefined
  }, [])

  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/25 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          dir="rtl"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-card relative w-full max-w-xl overflow-hidden p-6 sm:p-8"
          >
            <button
              onClick={dismiss}
              aria-label="إغلاق"
              className="absolute left-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-semibold tracking-wide text-primary">أهلاً بك في</p>
            <h2 id="onboarding-title" className="mt-1 text-2xl font-black text-foreground sm:text-3xl">
              صيدلية المصلي
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              رعاية دوائية موثوقة في عدن — تصفّح بحرية، بدون تسجيل.
            </p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map((h) => (
                <li
                  key={h.title}
                  className="glass-panel flex gap-3 rounded-2xl p-3.5 text-right"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <h.icon className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      <span aria-hidden className="ml-1">{h.emoji}</span>
                      {h.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{h.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={dismiss}
              className="press-scale mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95"
            >
              تصفح المتجر الآن
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OnboardingDocModal
