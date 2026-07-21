// Supabase sink for structured errors.
// Writes to public.error_logs (RLS allows anon/authenticated inserts with
// size caps enforced server-side). Truncates all fields defensively.
// Non-blocking, best-effort — logging must never crash the app.

import { supabase } from '@/integrations/supabase/client'
import type { ErrorReport } from './logger'

const APP_VERSION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) ||
  'unknown'

function truncate(s: string | undefined | null, max: number): string | null {
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

function deviceInfo(): Record<string, unknown> {
  if (typeof navigator === 'undefined') return {}
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number }
    deviceMemory?: number
  }
  const info: Record<string, unknown> = {
    platform: nav.platform,
    language: nav.language,
    online: nav.onLine,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    screen:
      typeof window !== 'undefined' && window.screen
        ? {
            w: window.screen.width,
            h: window.screen.height,
            dpr: window.devicePixelRatio,
          }
        : undefined,
    viewport:
      typeof window !== 'undefined'
        ? { w: window.innerWidth, h: window.innerHeight }
        : undefined,
    connection: nav.connection
      ? {
          effectiveType: nav.connection.effectiveType,
          downlink: nav.connection.downlink,
          rtt: nav.connection.rtt,
        }
      : undefined,
    appVersion: APP_VERSION,
  }
  return info
}

// Dedupe identical errors within a short window to protect from loops.
const seen = new Map<string, number>()
const DEDUPE_MS = 10_000

function shouldSend(key: string): boolean {
  const now = Date.now()
  const prev = seen.get(key) ?? 0
  if (now - prev < DEDUPE_MS) return false
  seen.set(key, now)
  // Trim map opportunistically.
  if (seen.size > 200) {
    for (const [k, t] of seen) if (now - t > DEDUPE_MS * 6) seen.delete(k)
  }
  return true
}

export async function sendReportToSupabase(report: ErrorReport): Promise<void> {
  try {
    const key = `${report.kind}:${report.boundary}:${report.message}`
    if (!shouldSend(key)) return

    const extra = {
      ...deviceInfo(),
      ...(report.extra ?? {}),
      correlationId: report.correlationId,
      kind: report.kind,
      status: report.status,
      timestamp: report.timestamp,
    }

    // Attach user_id when a session exists.
    const { data: sess } = await supabase.auth.getUser()

    const payload = {
      level: 'error' as const,
      source: truncate(report.boundary, 100) ?? 'unknown',
      message: truncate(report.message, 2000) ?? 'unknown',
      stack: truncate(report.stack ?? null, 20000),
      url: truncate(report.route ?? null, 2000),
      user_agent: truncate(report.userAgent ?? null, 1000),
      extra: extra as unknown as Record<string, never>,
      ...(sess?.user?.id ? { user_id: sess.user.id } : {}),
    }

    // Enforce extra size cap (server-side check limits stringified length to 8000).
    const extraStr = JSON.stringify(payload.extra)
    if (extraStr.length > 7500) {
      payload.extra = { truncated: true, kind: report.kind, correlationId: report.correlationId } as unknown as Record<string, never>
    }

    await supabase.from('error_logs').insert(payload)
  } catch {
    /* swallow — logging must never crash */
  }
}
