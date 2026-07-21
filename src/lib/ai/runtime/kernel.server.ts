// Brain Kernel — the SINGLE orchestrator. Agents never talk to each other directly.
// Every request (user->agent or agent->agent) passes through kernel.dispatch which:
//   1. loads capabilities of the caller
//   2. runs Safety Layer preflight (input validation + policy eval)
//   3. checks Budget Engine
//   4. resolves prompt via Prompt Registry (approved-only)
//   5. resolves model via Model Router (tier-based)
//   6. builds tool-context via Tool Registry (with retries/timeouts)
//   7. appends Memory Manager short+working context
//   8. calls Lovable AI Gateway via generateText
//   9. persists run to air_runs, evaluation to air_evaluations, memory to air_memory_layers,
//      audit to air_kernel_calls
// The result is model-agnostic, policy-driven, observable, and reversible.
import { generateText } from 'ai'
import type { Actor } from '../../session.server'
import { createLovableAiGatewayProvider } from '../gateway.server'
import { getTool, listTools } from '../tools.server'
import { loadApprovedPrompt } from './prompt-registry.server'
import { routeModel, type ModelTier } from './model-router'
import { getToolMeta, runToolWithPolicy } from './tool-registry.server'
import { loadCapabilities, requireCapability } from './capability-registry.server'
import { preflight } from './safety-layer.server'
import { checkBudgets, settleBudgets } from './budget-engine.server'
import { recordEvaluation } from './evaluation-engine.server'
import { buildContextBlock, remember } from './memory-manager.server'
import type { KernelCall } from './types'

interface AgentRow {
  key: string
  display_name: string
  prompt_key: string
  model: string | null
  allowed_tools: string[]
  temperature: number
  max_tokens: number
  is_active: boolean
}

export interface KernelDispatchInput {
  agentKey: string
  input: string
  toolInputs?: Record<string, Record<string, unknown>>
  fromAgent?: string | null
  tier?: ModelTier
}

export interface KernelDispatchResult {
  runId: string
  output: string
  toolsUsed: string[]
  totalTokens: number | null
  latencyMs: number
  model: string
  decision: { allowed: boolean; policyKey?: string }
}

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  // Typed client — proxy preserves SupabaseClient<Database> typing.
  return supabaseAdmin
}

async function auditKernelCall(actor: Actor, call: KernelCall, allowed: boolean, extras: { policyKey?: string; deniedReason?: string; decision?: Record<string, unknown> }) {
  const sb = await admin()
  await sb.from('air_kernel_calls').insert({
    organization_id: actor.organizationId,
    correlation_id: actor.correlationId,
    from_agent: call.fromAgent,
    to_agent: call.toAgent,
    purpose: call.purpose,
    allowed,
    decision: (extras.decision ?? {}) as never,
    policy_key: extras.policyKey ?? null,
    denied_reason: extras.deniedReason ?? null,
  })
}

async function loadAgent(agentKey: string): Promise<AgentRow> {
  const sb = await admin()
  const { data, error } = await sb.from('air_agents').select('*').eq('key', agentKey).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || !data.is_active) throw new Error(`agent not found or inactive: ${agentKey}`)
  return data as unknown as AgentRow
}

function emergencyResponse(reason: string, t0: number): KernelDispatchResult {
  return {
    runId: `emergency-${crypto.randomUUID()}`,
    output:
      '⚠️ نظام الذكاء الاصطناعي في وضع الطوارئ حالياً وتعذّر الوصول لطبقة الحوكمة. حاول مجدداً بعد قليل — تم تسجيل الحادثة.',
    toolsUsed: [],
    totalTokens: null,
    latencyMs: Date.now() - t0,
    model: 'emergency-fallback',
    decision: { allowed: false, policyKey: `emergency:${reason.slice(0, 60)}` },
  }
}

export async function dispatch(actor: Actor, req: KernelDispatchInput): Promise<KernelDispatchResult> {
  const apiKey = process.env.LOVABLE_API_KEY
  if (!apiKey) throw new Error('Missing LOVABLE_API_KEY')

  const t0 = Date.now()
  const call: KernelCall = {
    fromAgent: req.fromAgent ?? null,
    toAgent: req.agentKey,
    purpose: 'invoke',
    context: { tier: req.tier ?? 'balanced' },
  }

  // 1. Load agent + capabilities (Survival Mode: infrastructure failure → safe fallback,
  //    but preserve throw semantics for business errors like "agent not found").
  let agent: AgentRow
  try {
    agent = await loadAgent(req.agentKey)
  } catch (err) {
    const msg = (err as Error).message
    const isInfraFailure =
      /fetch failed|ECONNREFUSED|ETIMEDOUT|network|Failed to fetch|503|504/i.test(msg)
    if (isInfraFailure) {
      console.warn(`[Kernel] Survival mode engaged — DB unreachable: ${msg}`)
      return emergencyResponse('db_unreachable', t0)
    }
    throw err
  }
  const caps = await loadCapabilities(actor.organizationId, agent.key)
  requireCapability(caps, 'can_execute')

  // 2. Safety pre-flight
  const safety = await preflight(actor, call, req.input)
  if (!safety.ok) {
    await auditKernelCall(actor, call, false, { policyKey: safety.decision.policyKey, deniedReason: safety.decision.deniedReason })
    throw new Error(safety.decision.deniedReason ?? 'blocked by safety layer')
  }

  // 3. Budget check
  const budget = await checkBudgets(actor.organizationId, agent.key)
  if (!budget.allowed) {
    await auditKernelCall(actor, call, false, { deniedReason: budget.deniedReason })
    throw new Error(budget.deniedReason ?? 'budget exhausted')
  }

  // 4. Prompt registry (approved-only) — fallback: air_prompts row via direct read if legacy prompt has no status column.
  const prompt = await loadApprovedPrompt(agent.prompt_key)

  // 5. Model router — respects agent.model as a pin, otherwise tier-based.
  const routed = routeModel({ tier: req.tier ?? 'balanced', prefer: agent.model ?? undefined })

  // 6. Tool context (only allowed + capability-checked + policied)
  const toolsUsed: string[] = []
  const toolChunks: string[] = []
  if (caps.can_call_tools) {
    for (const key of agent.allowed_tools ?? []) {
      const def = getTool(key)
      const meta = getToolMeta(key)
      if (!def || !meta) continue
      const input = req.toolInputs?.[key] ?? {}
      // Skip tools that need explicit input.
      const requiresInput = key === 'search_products' || key === 'get_product_stock'
      if (requiresInput && Object.keys(input).length === 0) continue
      try {
        const res = await runToolWithPolicy(def, { actor }, input)
        toolsUsed.push(key)
        toolChunks.push(`### tool:${key}\n${JSON.stringify(res, null, 2)}`)
      } catch (err) {
        toolChunks.push(`### tool:${key}\n${JSON.stringify({ ok: false, error: (err as Error).message })}`)
      }
    }
  }

  // 7. Memory context
  const memBlock = caps.can_learn ? await buildContextBlock(actor.organizationId, agent.key) : ''
  const contextBlock = [memBlock, toolChunks.join('\n\n')].filter(Boolean).join('\n\n')

  // 8. Insert run
  const sb = await admin()
  const { data: runIns, error: runErr } = await sb.from('air_runs').insert({
    organization_id: actor.organizationId,
    actor_user_id: actor.userId,
    agent_key: agent.key,
    model: routed.model,
    input: safety.redactedInput ?? req.input,
    status: 'pending',
    tools_used: toolsUsed,
    correlation_id: actor.correlationId,
  }).select('id').single()
  if (runErr) throw new Error(runErr.message)
  const runId = runIns.id as string

  try {
    const gateway = createLovableAiGatewayProvider(apiKey)
    const model = gateway(routed.model)
    const messages = [
      { role: 'system' as const, content: prompt.system_prompt },
      ...(contextBlock ? [{ role: 'system' as const, content: `Runtime context:\n\n${contextBlock}` }] : []),
      { role: 'user' as const, content: safety.redactedInput ?? req.input },
    ]

    const result = await generateText({
      model,
      messages,
      temperature: agent.temperature,
      maxOutputTokens: agent.max_tokens,
    })

    const output = result.text
    const usage = result.usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined
    const latency = Date.now() - t0
    const totalTokens = usage?.totalTokens ?? null
    const costCents = totalTokens ? Math.ceil((totalTokens / 1_000_000) * routed.estimatedCostPerMTokenCents) : 0

    // 9. Persist run success + evaluation + budget settlement + audit + memory (if allowed)
    await Promise.all([
      sb.from('air_runs').update({
        status: 'success',
        output,
        prompt_tokens: usage?.inputTokens ?? null,
        completion_tokens: usage?.outputTokens ?? null,
        total_tokens: totalTokens,
        latency_ms: latency,
      }).eq('id', runId),
      recordEvaluation({
        organizationId: actor.organizationId,
        runId,
        latencyMs: latency,
        costCents,
        success: true,
      }),
      settleBudgets(actor.organizationId, agent.key, totalTokens ?? 0, costCents),
      auditKernelCall(actor, call, true, { decision: { model: routed.model, tools: toolsUsed, tier: req.tier ?? 'balanced' } }),
      caps.can_learn
        ? remember({
            organizationId: actor.organizationId,
            agentKey: agent.key,
            layer: 'short',
            content: `Q: ${req.input.slice(0, 200)} | A: ${output.slice(0, 200)}`,
            importance: 0.6,
          })
        : Promise.resolve(),
    ])

    return {
      runId,
      output,
      toolsUsed,
      totalTokens,
      latencyMs: latency,
      model: routed.model,
      decision: { allowed: true },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await Promise.all([
      sb.from('air_runs').update({ status: 'error', error_message: msg, latency_ms: Date.now() - t0 }).eq('id', runId),
      recordEvaluation({
        organizationId: actor.organizationId,
        runId,
        latencyMs: Date.now() - t0,
        success: false,
        feedback: { error: msg },
      }),
      auditKernelCall(actor, call, false, { deniedReason: msg }),
    ])
    throw new Error(msg)
  }
}

export function kernelListTools() {
  return listTools().map((t) => {
    const m = getToolMeta(t.key)
    return {
      key: t.key,
      description: t.description,
      capability: m?.capability ?? null,
      owner: m?.owner ?? null,
      version: m?.version ?? null,
    }
  })
}
