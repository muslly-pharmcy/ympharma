// Doctor duplicate scoring: name similarity + phone + specialty overlap → 0-100.
import { normalizeAr } from "@/modules/doctors/domain/arabicNormalize";
import { phonesMatch } from "@/lib/normalize/phone";

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeAr(a);
  const nb = normalizeAr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 0 : Math.max(0, 1 - dist / maxLen);
}

export type DuplicateInput = {
  name_ar: string;
  phone?: string | null;
  specialties?: string[];
};

export type DuplicateCandidate = {
  name_ar: string;
  phone?: string | null;
  specialties?: string[];
};

export function scoreDuplicate(input: DuplicateInput, candidate: DuplicateCandidate): number {
  const sim = nameSimilarity(input.name_ar, candidate.name_ar);
  const nameScore = sim >= 0.95 ? 55 : sim >= 0.8 ? 35 : sim >= 0.6 ? 15 : 0;
  const phoneScore = phonesMatch(input.phone, candidate.phone) ? 35 : 0;

  const inSpecs = (input.specialties ?? []).map((s) => normalizeAr(s));
  const candSpecs = (candidate.specialties ?? []).map((s) => normalizeAr(s));
  const overlap = inSpecs.some((s) => s && candSpecs.includes(s));
  const specScore = overlap ? 10 : 0;

  return Math.min(100, nameScore + phoneScore + specScore);
}
