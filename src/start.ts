import { createStart } from '@tanstack/react-start'
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher'
import { securityHeadersMiddleware } from '@/lib/security/headers.server'

export const startInstance = createStart(() => {
  // Fail fast with a clear message if Lovable Cloud env vars are missing.
  // Guarded to server-only: the browser bundle has no process.env.
  if (typeof window === 'undefined') {
    import('@/lib/env-check.server').then((m) => m.validateCloudEnv())
  }

  return {
    requestMiddleware: [securityHeadersMiddleware],
    functionMiddleware: [attachSupabaseAuth],
  }
})
