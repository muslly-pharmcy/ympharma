import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const refreshInput = z.object({
  organizationId: z.string().uuid(),
  windowDays: z.number().int().min(14).max(365).optional(),
  leadTimeDays: z.number().int().min(1).max(180).optional(),
  coverDays: z.number().int().min(7).max(365).optional(),
})

const listInput = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(['open', 'drafted', 'dismissed', 'ordered']).optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

const decideInput = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'drafted', 'dismissed', 'ordered']),
})

/** Recompute predictive reorder suggestions for an organization. */
export const refreshReorder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => refreshInput.parse(data))
  .handler(async ({ data, context }) => {
    const { assertPurchasingWrite, runRefresh } = await import('./reorder.server')
    await assertPurchasingWrite(context.supabase, context.userId, data.organizationId)
    return runRefresh(data)
  })

/** List current suggestions (RLS-scoped to the caller's organization). */
export const listReorderSuggestions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listInput.parse(data))
  .handler(async ({ data, context }) => {
    const { fetchSuggestions } = await import('./reorder.server')
    return fetchSuggestions(context.supabase, data)
  })

/** Mark a suggestion as drafted / dismissed / ordered. */
export const decideReorderSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => decideInput.parse(data))
  .handler(async ({ data, context }) => {
    const { updateSuggestionStatus } = await import('./reorder.server')
    return updateSuggestionStatus(context.supabase, data.id, data.status)
  })
