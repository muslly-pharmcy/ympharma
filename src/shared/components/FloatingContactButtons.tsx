import { useState } from 'react'
import { MessageCircle, Bot } from 'lucide-react'
import { PHARMACY } from '@/shared/branding'
import { ChatWidget } from './ChatWidget'

// Floating quick-contact buttons: WhatsApp direct + inline AI chat popup.
export function FloatingContactButtons() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        dir="ltr"
        className="fixed bottom-20 left-4 z-40 flex flex-col gap-3 sm:bottom-6"
      >
        <a
          href={`${PHARMACY.whatsappUrl}?text=${encodeURIComponent('مرحباً، أحتاج استشارة من صيدلية المصلي')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل عبر واتساب"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="مساعد الذكاء الصناعي"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:scale-105"
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
      {open && <ChatWidget onClose={() => setOpen(false)} />}
    </>
  )
}
