/**
 * AI feedback server functions.
 * Admin/owner can submit thumbs-up/down on ai_decisions rows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitSchema = z.object({
  decisionId: z.string().uuid(),
  rating: z.number().min(-1).max(1),
  note: z.string().max(2000).optional(),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("Forbidden: admin role required");
}

export const submitAiFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("ai_feedback")
      .insert({
        decision_id: data.decisionId,
        rating: data.rating,
        feedback: data.note ? { note: data.note } : {},
        submitted_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

const RecentSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
});

export const listRecentAiDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecentSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("ai_decisions")
      .select("id, event_id, agent_name, decision_type, action, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    let feedbackByDecision: Record<string, { rating: number; created_at: string }[]> = {};
    if (ids.length > 0) {
      const { data: fb } = await context.supabase
        .from("ai_feedback")
        .select("decision_id, rating, created_at")
        .in("decision_id", ids);
      for (const f of fb ?? []) {
        (feedbackByDecision[f.decision_id] ??= []).push({
          rating: Number(f.rating),
          created_at: f.created_at,
        });
      }
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      feedback: feedbackByDecision[r.id] ?? [],
    }));
  });
