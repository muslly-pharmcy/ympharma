/**
 * Lovable AI Gateway embedding helper — server-only.
 *
 * Uses `openai/text-embedding-3-small` (1536 dims) to match the
 * public.ai_neural_memory column and fit under the pgvector hnsw
 * 2000-dim cap so we can index the column directly.
 *
 * Never import from client code.
 */
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const MAX_BATCH = 100;

export class EmbeddingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}

export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError("LOVABLE_API_KEY not configured", 500, false);
  }

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const chunk = inputs.slice(i, i + MAX_BATCH);
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: chunk }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      throw new EmbeddingError(
        `embeddings ${res.status}: ${body.slice(0, 200)}`,
        res.status,
        retryable,
      );
    }

    const json = (await res.json()) as {
      data?: { index: number; embedding: number[] }[];
    };
    const rows = json.data ?? [];
    rows.sort((a, b) => a.index - b.index);
    for (const r of rows) out.push(r.embedding);
  }
  return out;
}
