// Feedback Collector — Phase 3 (P3-GATE-02 + P3-GATE-05).
// Strict pipeline: validate → deduplicate → persist → aggregate insights.
// Non-blocking by design — callers should `void` the result.
//
// Server-only.
import { z } from "zod";

const FeedbackSchema = z.object({
  post_id: z.string().uuid(),
  platform: z.enum(["facebook", "instagram", "twitter", "telegram"]),
  external_id: z.string().min(1).max(256).optional().nullable(),
  likes: z.number().int().min(0).max(10_000_000).default(0),
  comments: z.number().int().min(0).max(10_000_000).default(0),
  shares: z.number().int().min(0).max(10_000_000).default(0),
  views: z.number().int().min(0).max(1_000_000_000).default(0),
  raw_payload: z.unknown().optional().nullable(),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export interface CollectResult {
  ok: boolean;
  duplicate?: boolean;
  reason?: string;
  id?: number;
}

const DEDUP_WINDOW_HOURS = 48;

/**
 * P3-GATE-02: validates payload, blocks poisoned values, deduplicates by
 * (post_id, external_id) within a 48h window, persists to
 * `agent_feedback_events`, then upserts the latest snapshot into
 * `social_post_stats`. All failures are caught — never throws to caller
 * (P3-GATE-05).
 */
export async function collectPostFeedback(input: unknown): Promise<CollectResult> {
  try {
    const parsed = FeedbackSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, reason: `validation_failed: ${parsed.error.issues[0]?.message ?? "unknown"}` };
    }
    const data = parsed.data;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Dedup: same external_id for same post within 48h is a no-op
    if (data.external_id) {
      const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3600_000).toISOString();
      const { data: dup, error: dupErr } = await supabaseAdmin
        .from("agent_feedback_events")
        .select("id")
        .eq("post_id", data.post_id)
        .eq("external_id", data.external_id)
        .gte("received_at", since)
        .limit(1)
        .maybeSingle();
      if (dupErr) console.warn("[feedback.dedup-lookup]", dupErr.message);
      if (dup?.id) return { ok: true, duplicate: true, id: dup.id };
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("agent_feedback_events")
      .insert({
        post_id: data.post_id,
        platform: data.platform,
        external_id: data.external_id ?? null,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        views: data.views,
        raw_payload: (data.raw_payload ?? null) as any,
      })
      .select("id")
      .single();
    if (insErr) {
      // Unique-violation = duplicate raced — treat as ok+duplicate
      if (insErr.code === "23505") return { ok: true, duplicate: true };
      return { ok: false, reason: `insert_failed: ${insErr.message}` };
    }

    // Mirror latest snapshot into social_post_stats (one row per post)
    try {
      await supabaseAdmin
        .from("social_post_stats")
        .upsert(
          {
            post_id: data.post_id,
            likes: data.likes,
            comments: data.comments,
            shares: data.shares,
            views: data.views,
            collected_at: new Date().toISOString(),
          },
          { onConflict: "post_id" },
        );
    } catch (e) {
      console.warn("[feedback.stats-upsert]", (e as Error).message);
    }

    return { ok: true, id: inserted.id };
  } catch (e) {
    console.error("[feedback.collector]", (e as Error).message);
    return { ok: false, reason: (e as Error).message };
  }
}

/**
 * Aggregates engagement over the trailing window into `agent_performance_insights`.
 * Produces recommendations only — never mutates weights or prompts
 * (architecture guardrail: human-in-the-loop).
 */
export async function generateInsights(windowDays = 7): Promise<{ ok: boolean; inserted?: number; reason?: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("social_posts")
      .select("id,platform,variant_id,social_post_stats(likes,comments,shares,views)")
      .gte("created_at", since)
      .eq("status", "published");
    if (error) return { ok: false, reason: error.message };

    type Row = { platform: string; variant_id: string | null; eng: number };
    const flat: Row[] = (rows ?? []).map((r: any) => {
      const s = Array.isArray(r.social_post_stats) ? r.social_post_stats[0] : r.social_post_stats;
      const eng = s ? (s.likes ?? 0) + (s.comments ?? 0) * 2 + (s.shares ?? 0) * 3 : 0;
      return { platform: r.platform, variant_id: r.variant_id, eng };
    });

    if (flat.length < 5) {
      return { ok: true, inserted: 0, reason: "sample_too_small" };
    }

    const platforms = Array.from(new Set(flat.map((r) => r.platform)));
    const inserts: any[] = [];

    for (const p of [null as string | null, ...platforms]) {
      const subset = p ? flat.filter((r) => r.platform === p) : flat;
      const avg = subset.reduce((s, r) => s + r.eng, 0) / subset.length;
      const byVariant = new Map<string, { sum: number; n: number }>();
      for (const r of subset) {
        const key = r.variant_id ?? "unknown";
        const cur = byVariant.get(key) ?? { sum: 0, n: 0 };
        cur.sum += r.eng;
        cur.n += 1;
        byVariant.set(key, cur);
      }
      const topVariant = Array.from(byVariant.entries())
        .map(([k, v]) => ({ k, score: v.n > 0 ? v.sum / v.n : 0, n: v.n }))
        .sort((a, b) => b.score - a.score)[0];

      const recommendations: Array<{ type: string; message: string }> = [];
      if (avg < 1) recommendations.push({ type: "engagement", message: "متوسط التفاعل منخفض — راجع نبرة الكتابة والصور." });
      if (topVariant && topVariant.n >= 3) {
        recommendations.push({
          type: "variant",
          message: `النموذج ${topVariant.k} يحقق أعلى متوسط (${topVariant.score.toFixed(1)}). فكّر برفع وزنه يدوياً.`,
        });
      }

      inserts.push({
        window_days: windowDays,
        platform: p,
        sample_size: subset.length,
        avg_engagement: Number(avg.toFixed(2)),
        top_variant_id: topVariant?.k ?? null,
        top_tone: null,
        recommendations,
      });
    }

    if (inserts.length === 0) return { ok: true, inserted: 0 };
    const { error: insErr } = await supabaseAdmin.from("agent_performance_insights").insert(inserts);
    if (insErr) return { ok: false, reason: insErr.message };
    return { ok: true, inserted: inserts.length };
  } catch (e) {
    console.error("[feedback.insights]", (e as Error).message);
    return { ok: false, reason: (e as Error).message };
  }
}
