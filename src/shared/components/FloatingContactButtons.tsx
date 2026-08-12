import { useState } from 'react'
import { MessageCircle, Bot } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { PHARMACY } from '@/shared/branding'
import { ChatWidget } from './ChatWidget'

// Glassmorphic floating dock: WhatsApp direct + inline AI chat popup.
export function FloatingContactButtons() {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const hover = reduce ? undefined : { scale: 1.06, y: -3 }
  const tap = reduce ? undefined : { scale: 0.94 }
  const spring = { type: 'spring', stiffness: 300, damping: 20 } as const

  return (
    <>
      <div
        dir="ltr"
        className="glass-dock fixed bottom-20 left-4 z-40 flex flex-col gap-2 p-2 sm:bottom-6"
      >
        <motion.a
          href={`${PHARMACY.whatsappUrl}?text=${encodeURIComponent('مرحباً، أحتاج استشارة من صيدلية المصلي')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل عبر واتساب"
          whileHover={hover}
          whileTap={tap}
          transition={spring}
          className="dock-item group flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-emerald-500/25"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="dock-tip">واتساب</span>
        </motion.a>

        <motion.button
          onClick={() => setOpen((v) => !v)}
          aria-label="مساعد الذكاء الصناعي"
          aria-expanded={open}
          whileHover={hover}
          whileTap={tap}
          transition={spring}
          className="dock-item group flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25"
        >
          <Bot className="h-6 w-6" />
          <span className="dock-tip">المساعد الذكي</span>
        </motion.button>
      </div>
      {open && <ChatWidget onClose={() => setOpen(false)} />}
    </>
  )
}
