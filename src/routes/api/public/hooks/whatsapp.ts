// WhatsApp Cloud API webhook.
// - GET  : Meta verification handshake (hub.mode/hub.verify_token/hub.challenge).
// - POST : Event delivery, HMAC-SHA256 verified using WHATSAPP_APP_SECRET.
// Both branches always return 200 quickly (Meta retries aggressively on 5xx).
import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { newCorrelationId } from '@/lib/errors/correlation'

interface WhatsAppChange {
  field?: string
  value?: {
    messages?: Array<{ id?: string; from?: string; type?: string; timestamp?: string }>
    statuses?: Array<{ id?: string; status?: string; timestamp?: string; recipient_id?: string }>
    metadata?: { phone_number_id?: string; display_phone_number?: string }
  }
}
interface WhatsAppEntry { id?: string; changes?: WhatsAppChange[] }
interface WhatsAppEnvelope { object?: string; entry?: WhatsAppEntry[] }

// tiny in-memory sliding window (per Worker instance). Meta call volume is low,
// this only exists to shed obvious floods before HMAC math.
const rlBuckets = new Map<string, number[]>()
function rateLimit(key: string, windowMs = 60_000, max = 120): boolean {
  const now = Date.now()
  const arr = (rlBuckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= max) { rlBuckets.set(key, arr); return false }
  arr.push(now); rlBuckets.set(key, arr); return true
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !header.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = header.slice('sha256='.length)
  const a = Buffer.from(provided, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length === 0 || a.length !== b.length) return false
  try { return timingSafeEqual(a, b) } catch { return false }
}

async function persistEvents(envelope: WhatsAppEnvelope, correlationId: string): Promise<{ inserted: number; duplicates: number }> {
  const rows: Array<Record<string, unknown>> = []
  for (const entry of envelope.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value) continue
      const meta = value.metadata ?? {}
      for (const m of value.messages ?? []) {
        if (!m.id) continue
        rows.push({
          message_id: m.id,
          event_type: 'message',
          direction: 'inbound',
          from_number: m.from ?? null,
          phone_number_id: meta.phone_number_id ?? null,
          payload: change as unknown,
          correlation_id: correlationId,
        })
      }
      for (const s of value.statuses ?? []) {
        if (!s.id) continue
        rows.push({
          message_id: `${s.id}:${s.status ?? 'unknown'}`,
          event_type: 'status',
          direction: 'outbound',
          from_number: s.recipient_id ?? null,
          phone_number_id: meta.phone_number_id ?? null,
          payload: change as unknown,
          correlation_id: correlationId,
        })
      }
    }
  }
  if (rows.length === 0) return { inserted: 0, duplicates: 0 }

  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    // `message_id` is a UNIQUE constraint → idempotency for Meta re-deliveries.
    const { data, error } = await supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('whatsapp_events' as any)
      .upsert(rows, { onConflict: 'message_id', ignoreDuplicates: true })
      .select('id')
    if (error) {
      console.error('[whatsapp] persist error', { correlationId, error: error.message })
      return { inserted: 0, duplicates: rows.length }
    }
    const inserted = data?.length ?? 0
    return { inserted, duplicates: rows.length - inserted }
  } catch (e) {
    console.error('[whatsapp] persist threw', { correlationId, err: (e as Error).message })
    return { inserted: 0, duplicates: rows.length }
  }
}

export const Route = createFileRoute('/api/public/hooks/whatsapp')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')
        const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? ''
        if (!expected) return new Response('not configured', { status: 500 })
        if (mode === 'subscribe' && token && challenge) {
          const a = Buffer.from(token)
          const b = Buffer.from(expected)
          if (a.length === b.length && timingSafeEqual(a, b)) {
            return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
          }
        }
        return new Response('forbidden', { status: 403 })
      },
      POST: async ({ request }) => {
        const correlationId = newCorrelationId('wa')
        const secret = process.env.WHATSAPP_APP_SECRET ?? ''
        if (!secret) {
          console.error('[whatsapp] missing WHATSAPP_APP_SECRET', { correlationId })
          // Return 200 to stop Meta retries on a config issue we own.
          return new Response('ok', { status: 200 })
        }
        const ipKey = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown'
        if (!rateLimit(`whatsapp:${ipKey}`)) {
          return new Response('rate_limited', { status: 429, headers: { 'retry-after': '30' } })
        }
        // Read raw body BEFORE parsing — HMAC is over exact bytes.
        const raw = await request.text()
        const sig = request.headers.get('x-hub-signature-256')
        if (!verifySignature(raw, sig, secret)) {
          console.warn('[whatsapp] bad signature', { correlationId })
          return new Response('invalid signature', { status: 401 })
        }
        let envelope: WhatsAppEnvelope = {}
        try { envelope = JSON.parse(raw) as WhatsAppEnvelope } catch {
          console.warn('[whatsapp] bad json', { correlationId })
          return new Response('ok', { status: 200 })
        }
        const result = await persistEvents(envelope, correlationId)
        console.info('[whatsapp] processed', {
          correlationId,
          entries: envelope.entry?.length ?? 0,
          inserted: result.inserted,
          duplicates: result.duplicates,
        })
        // Always 200 so Meta doesn't retry successful deliveries.
        return new Response('ok', { status: 200 })
      },
    },
  },
})
