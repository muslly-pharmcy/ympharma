import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { PHARMACY } from '@/shared/branding'

type Msg = { role: 'user' | 'assistant'; content: string }

// Lightweight floating AI chat popup for site visitors. Uses the same
// Lovable AI Gateway path as /ai-chat but stays inline (no navigation).
export function ChatWidget({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `مرحباً بك في ${PHARMACY.nameAr} 🌿\nأنا مساعدك الصحي الذكي. كيف أساعدك اليوم؟`,
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setBusy(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      const res = await fetch('/api/chat-widget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { reply?: string }
      setMessages([...next, { role: 'assistant', content: data.reply ?? '—' }])
    } catch (e) {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: `تعذّر الرد الآن. جرّب التواصل عبر واتساب: ${PHARMACY.phone}`,
        },
      ])
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-6 left-4 z-50 flex h-[520px] w-[90vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-6"
    >
      <header className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">مساعد {PHARMACY.nameAr}</p>
            <p className="text-[10px] opacity-80">متاح 24/7 · الردود إرشادية</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-1 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-800'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" /> يكتب…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="flex items-center gap-2 border-t border-gray-100 bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك…"
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-white"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
          aria-label="إرسال"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
