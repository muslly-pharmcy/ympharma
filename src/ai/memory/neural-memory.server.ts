/**
 * NeuralMemory — server-only vector memory (pgvector).
 *
 * Wraps public.ai_neural_memory and public.match_ai_neural_memory.
 * Embedding calls consume Lovable AI credits; call sites should be
 * feature-flagged when running in a hot loop.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMBEDDING_MODEL,
  embedText,
} from "@/lib/ai-embeddings.server";

export interface NeuralStoreInput {
  owner_type: string;
  owner_id?: string | null;
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
  importance?: number;
}

export interface NeuralSearchOptions {
  limit?: number;
  ownerType?: string | null;
}

export interface NeuralHit {
  id: string;
  owner_type: string;
  owner_id: string | null;
  memory_category: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
  created_at: string;
}

export class NeuralMemory {
  constructor(private readonly sb: SupabaseClient) {}

  async store(input: NeuralStoreInput) {
    const embedding = await embedText(input.content);
    const { data, error } = await this.sb
      .from("ai_neural_memory")
      .insert({
        owner_type: input.owner_type,
        owner_id: input.owner_id ?? null,
        memory_category: input.category,
        content: input.content,
        metadata: input.metadata ?? {},
        embedding: embedding as unknown as never,
        importance: clamp01(input.importance ?? 0.5),
        model_version: EMBEDDING_MODEL,
      })
      .select("id")
      .single();

    if (error) throw new Error(`neural.store failed: ${error.message}`);
    return data;
  }

  async search(query: string, options: NeuralSearchOptions = {}): Promise<NeuralHit[]> {
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
    const embedding = await embedText(query);
    const { data, error } = await this.sb.rpc("match_ai_neural_memory", {
      query_embedding: embedding as unknown as never,
      match_count: limit,
      filter_owner_type: options.ownerType ?? null,
    });
    if (error) throw new Error(`neural.search failed: ${error.message}`);
    return (data ?? []) as NeuralHit[];
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
