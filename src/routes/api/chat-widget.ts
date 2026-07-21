import { createFileRoute } from '@tanstack/react-router'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

// Simple non-streaming chat endpoint for the floating site widget.
export const Route = createFileRoute('/api/chat-widget')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY
        if (!key) return new Response('missing LOVABLE_API_KEY', { status: 500 })
        const body = (await request.json()) as { messages?: Msg[] }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : []
        const systemPrompt = `أنت "مساعد صيدلية المصلي" في عدن، اليمن. تجيب بالعربية بوضوح واحترام. قدّم إرشادات صحية عامة وذكّر دائماً بأن الرد ليس بديلاً عن استشارة الطبيب أو الصيدلي. لأي حالة طارئة، انصح بالتواصل الفوري على الرقم +967 782 878 280 أو زيارة الصيدلية. لا تكتب وصفات دوائية مخصصة ولا تحدد جرعات بدون توجيه من طبيب.`

        const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
        })
        if (!r.ok) {
          const text = await r.text()
          console.error('[chat-widget]', r.status, text)
          return new Response(JSON.stringify({ error: text }), { status: r.status })
        }
        const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const reply = data.choices?.[0]?.message?.content ?? '—'
        return Response.json({ reply })
      },
    },
  },
})
