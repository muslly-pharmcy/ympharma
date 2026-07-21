import { useEffect } from 'react'
import { classifyError } from '@/lib/errors/classify'
import { newCorrelationId } from '@/lib/errors/correlation'
import { reportError } from '@/lib/errors/logger'

/**
 * Global window error + unhandledrejection listeners.
 * Ensures runtime errors on iOS/Android also flow through the structured
 * reportError pipeline (console + registered hooks), not only React boundaries.
 */
export function GlobalErrorListeners() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      try {
        const err = event.error instanceof Error ? event.error : new Error(event.message)
        reportError({
          correlationId: newCorrelationId('window'),
          classified: classifyError(err),
          boundary: 'window:error',
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        })
      } catch {
        /* swallow — logging must never crash */
      }
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason
        const err = reason instanceof Error ? reason : new Error(String(reason))
        reportError({
          correlationId: newCorrelationId('promise'),
          classified: classifyError(err),
          boundary: 'window:unhandledrejection',
        })
      } catch {
        /* swallow */
      }
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
