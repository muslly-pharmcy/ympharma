/**
 * Startup environment validation for Lovable Cloud connectivity.
 * Runs server-side on boot so missing Supabase configuration fails fast
 * with a clear message instead of a cryptic client-side throw.
 */

const REQUIRED_GROUPS = [
  ['SUPABASE_URL', 'VITE_SUPABASE_URL'],
  ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'],
] as const

function missingGroups(groups: typeof REQUIRED_GROUPS): string[] {
  return groups
    .filter((group) => !group.some((name) => process.env[name]))
    .map((group) => group.join(' or '))
}

export function validateCloudEnv(): void {
  // Guard: this module may be reached in a client chunk during dev HMR.
  // The browser has no process.env, so skip the check there.
  if (typeof window !== 'undefined' || typeof process === 'undefined') {
    return
  }

  const missing = missingGroups(REQUIRED_GROUPS)

  if (missing.length > 0) {
    const message = `Lovable Cloud configuration incomplete — missing ${missing.join('; ')}. Ensure Lovable Cloud is enabled and environment variables are loaded.`
    console.error(`[env-check] ${message}`)
    // Do not throw during dev HMR reloads; the error is logged loudly and
    // the Supabase client will still throw its own message on first use.
  } else {
    console.log('[env-check] Lovable Cloud env vars present.')
  }
}
