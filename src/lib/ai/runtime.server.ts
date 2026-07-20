// AI Runtime — thin back-compat shim. All real work happens in the Brain Kernel
// (src/lib/ai/runtime/kernel.server.ts). Keep this file so existing server-fn
// callers (ai.functions.ts) don't need to change.
import type { Actor } from '../session.server'
import { dispatch, kernelListTools } from './runtime/kernel.server'

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

export async function runAgent(actor: Actor, req: RunAgentInput): Promise<RunAgentResult> {
  const res = await dispatch(actor, { ...req, fromAgent: null })
  return {
    runId: res.runId,
    output: res.output,
    toolsUsed: res.toolsUsed,
    totalTokens: res.totalTokens,
    latencyMs: res.latencyMs,
  }
}

export function listAvailableTools() {
  return kernelListTools().map((t) => ({ key: t.key, description: t.description }))
}
