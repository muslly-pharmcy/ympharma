import { createStart } from '@tanstack/react-start'
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher'
import { securityHeadersMiddleware } from '@/lib/security/headers.server'
import { validateCloudEnv } from '@/lib/env-check.server'

// Fail fast with a clear message if Lovable Cloud env vars are missing.
validateCloudEnv()

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}))
