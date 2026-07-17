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

export const neuralSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { NeuralMemory } = await import("@/ai/memory/neural-memory.server");
    const engine = new NeuralMemory(context.supabase);
    try {
      const hits = await engine.search(data.query, {
        limit: data.limit,
        ownerType: data.ownerType ?? null,
      });
      return { ok: true as const, hits };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: msg, hits: [] };
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
