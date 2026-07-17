/**
 * Admin-only server functions for the Neural Memory Planet (pgvector).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SearchSchema = z.object({
  query: z.string().min(2).max(2000),
  limit: z.number().int().min(1).max(50).default(10),
  ownerType: z.string().min(1).max(60).optional(),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("Forbidden: admin role required");
}

export interface NeuralSearchResultHit {
  id: string;
  owner_type: string;
  owner_id: string | null;
  memory_category: string;
  content: string;
  similarity: number;
  created_at: string;
  metadata_json: string;
}

export interface NeuralSearchResponse {
  ok: boolean;
  error: string | null;
  hits: NeuralSearchResultHit[];
}

export const neuralSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data, context }): Promise<NeuralSearchResponse> => {
    await assertAdmin(context);
    const { NeuralMemory } = await import("@/ai/memory/neural-memory.server");
    const engine = new NeuralMemory(context.supabase);
    try {
      const raw = await engine.search(data.query, {
        limit: data.limit,
        ownerType: data.ownerType ?? null,
      });
      const hits: NeuralSearchResultHit[] = raw.map((h) => ({
        id: h.id,
        owner_type: h.owner_type,
        owner_id: h.owner_id,
        memory_category: h.memory_category,
        content: h.content,
        similarity: Number(h.similarity),
        created_at: h.created_at,
        metadata_json: JSON.stringify(h.metadata ?? {}),
      }));
      return { ok: true, error: null, hits };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg, hits: [] };
    }
  });

export const neuralStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const enabled = process.env.AI_NEURAL_ENABLE === "1";
    const { count, error } = await context.supabase
      .from("ai_neural_memory")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { enabled, total: count ?? 0 };
  });
