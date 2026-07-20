// CSP violation report sink — Phase 1.5.
// Accepts both legacy `application/csp-report` and modern Reporting API
// (`application/reports+json`). Body cap: 16KB. No auth (browsers won't send it),
// but bodies are size-capped, JSON-parsed defensively, and never trusted for logic.
import { createFileRoute } from '@tanstack/react-router'

const MAX_BODY = 16 * 1024

async function readCapped(request: Request): Promise<string> {
  const cl = Number(request.headers.get('content-length') ?? '0')
  if (cl > MAX_BODY) return ''
  const text = await request.text()
  return text.slice(0, MAX_BODY)
}

export const Route = createFileRoute('/api/public/csp-report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await readCapped(request)
        let parsed: unknown = null
        try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = { raw } }
        // Log-only for now. Aggregation/persistence lands with Wave F (Observability).
        // eslint-disable-next-line no-console
        console.warn('[csp-report]', {
          ua: request.headers.get('user-agent'),
          ct: request.headers.get('content-type'),
          body: parsed,
        })
        // 204 = accepted, no content. Browsers ignore the response body anyway.
        return new Response(null, { status: 204 })
      },
    },
  },
})
