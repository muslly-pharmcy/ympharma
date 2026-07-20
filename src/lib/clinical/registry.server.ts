// Provider selection — server-only. Reads CLINICAL_PROVIDER env inside handler callers.
// New providers register themselves here without changing the engine.

import type { DrugKnowledgeProvider } from '@/domain/clinical/types'
import { nullProvider } from './null-provider'

const registry = new Map<string, DrugKnowledgeProvider>([[nullProvider.id, nullProvider]])

export function registerProvider(p: DrugKnowledgeProvider) {
  registry.set(p.id, p)
}

export function getProvider(id?: string | null): DrugKnowledgeProvider {
  if (!id) return nullProvider
  return registry.get(id) ?? nullProvider
}

export function listProviders(): Array<{ id: string; displayName: string }> {
  return Array.from(registry.values()).map((p) => ({ id: p.id, displayName: p.displayName }))
}
