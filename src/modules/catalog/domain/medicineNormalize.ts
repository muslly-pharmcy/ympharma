// Phoenix Quick Execution — Arabic/Latin medicine normalization for search.
// Pure client transform, no DB changes. Layered on top of catalog normalize.
import { normalizeAr } from "./normalize";

// Common Latin ↔ Arabic drug tokens + frequent misspellings observed in Yemen market.
// Keep entries lowercase; keys are surface forms, values are canonical tokens.
const CANONICAL_MAP: Record<string, string> = {
  // Vitamins
  "vit": "vitamin",
  "vit.": "vitamin",
  "vits": "vitamin",
  "فيتامين": "vitamin",
  "فتامين": "vitamin",
  "فتمين": "vitamin",
  "فايتمن": "vitamin",
  "ڤيتامين": "vitamin",
  // Common brands / actives
  "بنادول": "panadol",
  "باندول": "panadol",
  "بندول": "panadol",
  "بارسيتامول": "paracetamol",
  "باراسيتامول": "paracetamol",
  "باراستمول": "paracetamol",
  "ايبوبروفين": "ibuprofen",
  "ابوبروفين": "ibuprofen",
  "بروفين": "brufen",
  "اموكسيسيلين": "amoxicillin",
  "اموكسسلين": "amoxicillin",
  "اموكسلين": "amoxicillin",
  "اوجمنتين": "augmentin",
  "اجمنتين": "augmentin",
  "زنك": "zinc",
  "حديد": "iron",
  "كالسيوم": "calcium",
  "مغنيسيوم": "magnesium",
  "مغنسيوم": "magnesium",
  "اوميغا": "omega",
  "اوميجا": "omega",
  "بروبيوتك": "probiotic",
  "بروبيوتيك": "probiotic",
  "انسولين": "insulin",
  "ميتفورمين": "metformin",
};

// Bigram merges, e.g. "vit c" -> "vitamin_c"
const BIGRAM_MAP: Record<string, string> = {
  "vitamin c": "vitamin_c",
  "vitamin d": "vitamin_d",
  "vitamin b": "vitamin_b",
  "vitamin b12": "vitamin_b12",
  "vitamin a": "vitamin_a",
  "vitamin e": "vitamin_e",
  "omega 3": "omega_3",
  "omega3": "omega_3",
};

const STOPWORDS = new Set(["و", "او", "the", "a", "of", "for"]);

function stripLatinDiacritics(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a medicine search query into canonical tokens.
 * - Applies Arabic normalization (tashkeel, alef/ya/ta-marbuta unification).
 * - Maps common misspellings and Arabic ↔ Latin drug names to canonical tokens.
 * - Collapses bigrams like "vit c" → "vitamin_c".
 */
export function normalizeMedicineQuery(input: string | null | undefined): string {
  if (!input) return "";
  const base = normalizeAr(stripLatinDiacritics(input));
  const tokens = base
    .split(/[\s,._/\\-]+/)
    .filter(Boolean)
    .map((t) => CANONICAL_MAP[t] ?? t)
    .filter((t) => !STOPWORDS.has(t));

  // Bigram pass
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const bg = `${tokens[i]} ${tokens[i + 1] ?? ""}`.trim();
    if (BIGRAM_MAP[bg]) {
      merged.push(BIGRAM_MAP[bg]);
      i++;
    } else {
      merged.push(tokens[i]);
    }
  }
  return merged.join(" ").trim();
}

/** Returns both the raw normalized string and the canonical tokens. */
export function medicineSearchTerms(input: string): { canonical: string; tokens: string[] } {
  const canonical = normalizeMedicineQuery(input);
  return { canonical, tokens: canonical.split(/\s+/).filter(Boolean) };
}
