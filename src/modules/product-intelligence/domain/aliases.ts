// Phoenix P7-A — Alias candidate builder + match scoring.
import { normalize, tokenize, canonicalQuery } from "./normalize";

export type MatchKind = "exact" | "normalized" | "alias" | "fuzzy" | "alias_fuzzy";

export interface AliasCandidates {
  exact: string;
  normalized: string;
  canonical: string;
  tokens: string[];
  bigrams: string[];
}

export function buildAliasCandidates(query: string | null | undefined): AliasCandidates {
  const exact = (query ?? "").trim();
  const normalized = normalize(exact);
  const tokens = tokenize(exact);
  const canonical = tokens.join(" ");
  const bigrams: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  return { exact, normalized, canonical, tokens, bigrams };
}

const KIND_RANK: Record<MatchKind, number> = {
  exact: 0,
  normalized: 1,
  alias: 2,
  fuzzy: 3,
  alias_fuzzy: 4,
};

export function compareHits<T extends { match_kind: MatchKind; score: number }>(a: T, b: T): number {
  const kd = KIND_RANK[a.match_kind] - KIND_RANK[b.match_kind];
  if (kd !== 0) return kd;
  return b.score - a.score;
}

export function scoreMatch(kind: MatchKind, similarity = 1): number {
  const base = { exact: 1, normalized: 0.95, alias: 0.9, fuzzy: 0.7, alias_fuzzy: 0.65 }[kind];
  return Math.max(0, Math.min(1, base * similarity));
}

export { canonicalQuery, normalize, tokenize };
