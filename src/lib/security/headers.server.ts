// Wave C — Enterprise Security Hardening (Phase 1)
// Request-level security headers, applied to every server request (SSR, routes, fns).
// CSP is Report-Only first: collect violations without breaking the app; flip to enforce
// after a stable observation window with zero blocked-resource reports.
import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'

function buildCsp(supabaseUrl: string | undefined): string {
  const supaOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ''
  const supaWs = supaOrigin ? supaOrigin.replace(/^http/, 'ws') : ''
  // Permissive enough to render the current app (Vite HMR in dev, inline styles from
  // Tailwind, SSR hydration scripts, images from Supabase storage, WS for realtime).
  // Tightened iteratively based on Report-Only violations.
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri":    ["'self'"],
    "object-src":  ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "img-src":     ["'self'", 'data:', 'blob:', 'https:', ...(supaOrigin ? [supaOrigin] : [])],
    "font-src":    ["'self'", 'data:', 'https:'],
    "style-src":   ["'self'", "'unsafe-inline'"],
    "script-src":  ["'self'", "'unsafe-inline'"],
    "connect-src": ["'self'", 'https:', 'wss:', ...(supaOrigin ? [supaOrigin, supaWs] : [])],
    "worker-src":  ["'self'", 'blob:'],
    "media-src":   ["'self'", 'blob:', 'data:'],
    "manifest-src":["'self'"],
    "upgrade-insecure-requests": [],
  }
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ')
}

export const securityHeadersMiddleware = createMiddleware({ type: 'request' }).server(async ({ next }) => {
  const csp = buildCsp(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)
  setResponseHeaders({
    // CSP in Report-Only mode: no enforcement, only violation reports (dev tools console).
    'Content-Security-Policy-Report-Only': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'geolocation=(self)',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=(self)',
      'usb=()',
    ].join(', '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // HSTS: safe to always send; browsers ignore over plain HTTP.
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })
  return next()
})
