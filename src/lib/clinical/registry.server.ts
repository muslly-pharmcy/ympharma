// Provider selection — server-only. Reads CLINICAL_PROVIDER env inside handler callers.
// New providers register themselves here without changing the engine.

import type { DrugKnowledgeProvider } from '@/domain/clinical/types'
import { nullProvider } from './null-provider'
import { localDbProvider } from './local-db-provider.server'

const registry = new Map<string, DrugKnowledgeProvider>([
  [nullProvider.id, nullProvider],
  [localDbProvider.id, localDbProvider],
])

/** Default when CLINICAL_PROVIDER is unset: the curated local knowledge base. */
const defaultProvider: DrugKnowledgeProvider = localDbProvider

export function registerProvider(p: DrugKnowledgeProvider) {
  registry.set(p.id, p)
}

export function getProvider(id?: string | null): DrugKnowledgeProvider {
  if (!id) return defaultProvider
  return registry.get(id) ?? defaultProvider
}

export function listProviders(): Array<{ id: string; displayName: string }> {
  return Array.from(registry.values()).map((p) => ({ id: p.id, displayName: p.displayName }))
}
