import { Link } from '@tanstack/react-router'
import { MessageCircle, Bot } from 'lucide-react'
import { PHARMACY } from '@/shared/branding'

// Floating quick-contact buttons: WhatsApp direct to pharmacy + in-app AI chat.
export function FloatingContactButtons() {
  return (
    <div
      dir="ltr"
      className="fixed bottom-20 left-4 z-40 flex flex-col gap-3 sm:bottom-6"
    >
      <a
        href={`${PHARMACY.whatsappUrl}?text=${encodeURIComponent('مرحباً، أحتاج استشارة من صيدلية المصلي')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">
          تواصل عبر واتساب
        </span>
      </a>
      <Link
        to="/ai-chat"
        aria-label="مساعد الذكاء الصناعي"
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:scale-105"
      >
        <Bot className="h-6 w-6" />
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">
          مساعد ذكي 24/7
        </span>
      </Link>
    </div>
  )
}
