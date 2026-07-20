// Server-only actor resolution.
// Bridges the current demo session cookie to a Supabase-shaped actor.
// Swap the internals with `requireSupabaseAuth`'s context when real auth ships.
import { getCookie, getRequestHeader } from '@tanstack/react-start/server'

export interface Actor {
  userId: string
  organizationId: string
  roles: string[]
}

export class UnauthorizedError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Reads actor identity from headers/cookies set by the client-side demo auth.
 * Client sends `x-actor-user-id` + `x-actor-org-id`. Fallback to cookies for SSR.
 */
export function getActor(): Actor {
  const userId =
    getRequestHeader('x-actor-user-id') ?? getCookie('actor_user_id') ?? ''
  const organizationId =
    getRequestHeader('x-actor-org-id') ?? getCookie('actor_org_id') ?? ''
  const rolesRaw =
    getRequestHeader('x-actor-roles') ?? getCookie('actor_roles') ?? ''

  if (!userId || !organizationId) {
    throw new UnauthorizedError('Missing actor identity (demo session).')
  }
  const roles = rolesRaw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  return { userId, organizationId, roles }
}

export function requireOrg(actor: Actor, organizationId: string) {
  if (actor.organizationId !== organizationId) {
    throw new UnauthorizedError('Actor is not a member of this organization.')
  }
}
