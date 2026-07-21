// Capability Registry — declares what each agent may do.
// Fallback (no row) = read-only + can_call_tools + can_learn — safe default.
import type { CapabilityRow } from './types'

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  // Typed client — proxy preserves SupabaseClient<Database> typing.
  return supabaseAdmin
}

// Default caps: allow execute + tool calls. Safety layer, budget engine, and
// policy engine still gate every dispatch downstream; requiring an explicit
// air_capabilities row per (org, agent) was the top cause of "AI Kernel dead"
// in fresh orgs. Write/approve remain opt-in.
const DEFAULT: Omit<CapabilityRow, 'agent_key'> = {
  can_read: true,
  can_write: false,
  can_execute: true,
  can_call_tools: true,
  can_approve: false,
  can_learn: true,
  allowed_domains: [],
}

export async function loadCapabilities(orgId: string, agentKey: string): Promise<CapabilityRow> {
  const sb = await admin()
  const { data } = await sb.from('air_capabilities')
    .select('agent_key, can_read, can_write, can_execute, can_call_tools, can_approve, can_learn, allowed_domains')
    .eq('organization_id', orgId).eq('agent_key', agentKey).maybeSingle()
  return (data as CapabilityRow) ?? { agent_key: agentKey, ...DEFAULT }
}

export function requireCapability(caps: CapabilityRow, cap: keyof Omit<CapabilityRow, 'agent_key' | 'allowed_domains'>): void {
  if (!caps[cap]) throw new Error(`capability denied: ${caps.agent_key} lacks ${cap}`)
}
