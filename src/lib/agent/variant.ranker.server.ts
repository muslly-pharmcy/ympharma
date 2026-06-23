// Variant Ranker — Phase 2.
// Heuristic scoring over caption length fit, hashtag count, emoji density,
// CTA presence, and Twitter character cap. Returns the winner + per-variant
// scores so the Orchestrator can persist them as `decision_factors` and a
// `confidence_score` (0..1).
//
// Server-only. Pure function; no I/O.
import type { PostVariant } from "./content.generator.server";
import type { SocialPlatform } from "../social-content.server";

interface RankedVariant {
  variant_id: string;
  score: number;
  reasons: Record<string, number>;
}

const PLATFORM_TARGETS: Record<SocialPlatform, { idealLen: [number, number]; hardCap: number }> = {
  facebook: { idealLen: [180, 600], hardCap: 4000 },
  instagram: { idealLen: [80, 220], hardCap: 2200 },
  twitter: { idealLen: [60, 230], hardCap: 270 },
  telegram: { idealLen: [120, 400], hardCap: 4000 },
};

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function scoreVariant(v: PostVariant, platform: SocialPlatform): RankedVariant {
  const target = PLATFORM_TARGETS[platform];
  const len = (v.caption || "").length;

  // Length fit: peaks inside ideal band, decays outside, 0 above hardCap
  let lengthScore: number;
  if (len > target.hardCap) lengthScore = 0;
  else if (len < target.idealLen[0]) lengthScore = clamp01(len / target.idealLen[0]);
  else if (len > target.idealLen[1])
    lengthScore = clamp01(1 - (len - target.idealLen[1]) / (target.hardCap - target.idealLen[1]));
  else lengthScore = 1;

  const hashtagCount = v.hashtags?.length ?? 0;
  const hashtagScore = clamp01(hashtagCount === 0 ? 0.2 : 1 - Math.abs(hashtagCount - 5) / 10);

  const emojiCount = (v.caption.match(EMOJI_RE) || []).length;
  const emojiScore = clamp01(emojiCount === 0 ? 0.4 : 1 - Math.abs(emojiCount - 3) / 8);

  const ctaScore = v.cta && v.cta.trim().length > 4 ? 1 : 0.2;

  // Weighted composite
  const score =
    lengthScore * 0.4 + hashtagScore * 0.2 + emojiScore * 0.15 + ctaScore * 0.25;

  return {
    variant_id: v.variant_id,
    score: Number(score.toFixed(4)),
    reasons: {
      length: Number(lengthScore.toFixed(3)),
      hashtags: Number(hashtagScore.toFixed(3)),
      emoji: Number(emojiScore.toFixed(3)),
      cta: Number(ctaScore.toFixed(3)),
      char_count: len,
    },
  };
}

export interface RankingOutcome {
  winner: PostVariant;
  winner_id: string;
  confidence_score: number; // 0..1
  ranked: RankedVariant[];
}

export function rankVariants(variants: PostVariant[], platform: SocialPlatform): RankingOutcome {
  if (variants.length === 0) throw new Error("rankVariants: no variants provided");
  const ranked = variants.map((v) => scoreVariant(v, platform)).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1]?.score ?? 0;
  // Confidence = winner score scaled by how much it beats the runner-up
  const margin = Math.max(0, top.score - second);
  const confidence = clamp01(top.score * (0.7 + margin * 0.6));
  const winner = variants.find((v) => v.variant_id === top.variant_id) ?? variants[0];
  return {
    winner,
    winner_id: winner.variant_id,
    confidence_score: Number(confidence.toFixed(4)),
    ranked,
  };
}
