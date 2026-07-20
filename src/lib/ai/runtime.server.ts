// Agent Runtime — loads agent + prompt, gathers tool-context, calls Lovable AI, logs run.
import { generateText } from 'ai'
import type { Actor } from '../session.server'
import { createLovableAiGatewayProvider } from './gateway.server'
import { getTool, listTools } from './tools.server'

interface AgentRow {
  key: string
  display_name: string
  prompt_key: string
  model: string
  allowed_tools: string[]
  temperature: number
  max_tokens: number
  is_active: boolean
}

interface PromptRow {
  key: string
  system_prompt: string
}

export interface RunAgentInput {
  agentKey: string
  input: string
  toolInputs?: Record<string, Record<string, unknown>>
}

export interface RunAgentResult {
  runId: string
  output: string
  toolsUsed: string[]
  totalTokens: number | null
  latencyMs: number
}

async function loadAgent(agentKey: string): Promise<{ agent: AgentRow; prompt: PromptRow }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: agent, error: aErr } = await supabaseAdmin
    .from('air_agents').select('*').eq('key', agentKey).maybeSingle()
  if (aErr) throw new Error(aErr.message)
  if (!agent || !agent.is_active) throw new Error(`Agent not found or inactive: ${agentKey}`)
  const { data: prompt, error: pErr } = await supabaseAdmin
    .from('air_prompts').select('key, system_prompt').eq('key', agent.prompt_key).maybeSingle()
  if (pErr) throw new Error(pErr.message)
  if (!prompt) throw new Error(`Prompt not found: ${agent.prompt_key}`)
  return { agent: agent as unknown as AgentRow, prompt: prompt as unknown as PromptRow }
}

// Context Builder: run allowed tools with provided inputs (empty = defaults where safe).
async function buildContext(
  actor: Actor,
  allowedTools: string[],
  toolInputs: Record<string, Record<string, unknown>> = {},
): Promise<{ block: string; used: string[] }> {
  const used: string[] = []
  const chunks: string[] = []
  for (const key of allowedTools) {
    const def = getTool(key)
    if (!def) continue
    const input = toolInputs[key] ?? {}
    // For tools that need explicit input (like search_products, get_product_stock),
    // skip when caller didn't provide any input to keep context lean.
    const requiresInput = key === 'search_products' || key === 'get_product_stock'
    if (requiresInput && Object.keys(input).length === 0) continue
    try {
      const res = await def.execute({ actor }, input)
      used.push(key)
      chunks.push(`### tool:${key}\n${JSON.stringify(res, null, 2)}`)
    } catch (err) {
      chunks.push(`### tool:${key}\n${JSON.stringify({ ok: false, error: (err as Error).message })}`)
    }
  }
  return { block: chunks.join('\n\n'), used }
}

export async function runAgent(actor: Actor, req: RunAgentInput): Promise<RunAgentResult> {
  const apiKey = process.env.LOVABLE_API_KEY
  if (!apiKey) throw new Error('Missing LOVABLE_API_KEY')

  const t0 = Date.now()
  const { agent, prompt } = await loadAgent(req.agentKey)
  const context = await buildContext(actor, agent.allowed_tools ?? [], req.toolInputs)

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: runIns, error: runErr } = await supabaseAdmin
    .from('air_runs')
    .insert({
      organization_id: actor.organizationId,
      actor_user_id: actor.userId,
      agent_key: agent.key,
      model: agent.model,
      input: req.input,
      status: 'pending',
      tools_used: context.used,
      correlation_id: actor.correlationId,
    })
    .select('id').single()
  if (runErr) throw new Error(runErr.message)
  const runId = runIns.id as string

  try {
    const gateway = createLovableAiGatewayProvider(apiKey)
    const model = gateway(agent.model)
    const messages = [
      { role: 'system' as const, content: prompt.system_prompt },
      ...(context.block
        ? [{ role: 'system' as const, content: `Runtime context:\n\n${context.block}` }]
        : []),
      { role: 'user' as const, content: req.input },
    ]

    const result = await generateText({
      model,
      messages,
      temperature: agent.temperature,
      // Note: AI SDK maps to provider max tokens; keep bounded.
      maxOutputTokens: agent.max_tokens,
    })

    const output = result.text
    const usage = result.usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined
    const latency = Date.now() - t0

    await supabaseAdmin.from('air_runs').update({
      status: 'success',
      output,
      prompt_tokens: usage?.inputTokens ?? null,
      completion_tokens: usage?.outputTokens ?? null,
      total_tokens: usage?.totalTokens ?? null,
      latency_ms: latency,
    }).eq('id', runId)

    return {
      runId,
      output,
      toolsUsed: context.used,
      totalTokens: usage?.totalTokens ?? null,
      latencyMs: latency,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabaseAdmin.from('air_runs').update({
      status: 'error',
      error_message: msg,
      latency_ms: Date.now() - t0,
    }).eq('id', runId)
    throw new Error(msg)
  }
}

export function listAvailableTools() {
  return listTools().map((t) => ({ key: t.key, description: t.description }))
}
