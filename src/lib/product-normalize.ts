// Smart normalization for pharmacy product names.
//
// Goal: group products that are truly the same SKU while keeping different
// dosages / strengths / volumes separate, e.g.
//   "جنكة بيلوبا 120 mg"   -> key includes "120mg"
//   "جنكة بيلوبا 60 mg"    -> different key, never merged
//   "Vitamin B12 1000 mcg" -> key includes "1000mcg"
//
// Returns both a `key` for grouping and the extracted `dosage` tokens, so the
// UI can show the user *why* two items were/weren't grouped.

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
// Map Arabic-Indic + Persian digits to ASCII.
const DIGIT_MAP: Record<string, string> = {
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
  "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
};
const ARABIC_LETTER_FOLD: Record<string, string> = {
  "أ":"ا","إ":"ا","آ":"ا","ٱ":"ا",
  "ى":"ي","ئ":"ي",
  "ؤ":"و",
  "ة":"ه",
  "ـ":"", // tatweel
};

// Units we recognize. Order matters: longest match first.
const UNIT_TOKENS = [
  "mcg","µg","ug","mg","gm","gr","g","kg",
  "ml","cc","l",
  "iu","ui","mmol",
  "%",
];

function foldArabic(s: string): string {
  let out = "";
  for (const ch of s) out += ARABIC_LETTER_FOLD[ch] ?? DIGIT_MAP[ch] ?? ch;
  return out.replace(ARABIC_DIACRITICS, "");
}

/** Extract dosage tokens like "120mg", "1000mcg", "5%", "10ml" from the raw name. */
export function extractDosages(raw: string): string[] {
  const s = foldArabic((raw ?? "").toLowerCase()).replace(/[,]/g, ".");
  const out: string[] = [];
  const seen = new Set<string>();
  // Number + optional space + unit
  const re = /(\d+(?:\.\d+)?)\s*(mcg|µg|ug|mg|gm|gr|g|kg|ml|cc|l|iu|ui|mmol|%)(?![\p{L}\p{N}])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    let unit = m[2];
    if (unit === "µg" || unit === "ug") unit = "mcg";
    if (unit === "gm" || unit === "gr") unit = "g";
    if (unit === "cc") unit = "ml";
    if (unit === "ui") unit = "iu";
    const token = `${m[1]}${unit}`;
    if (!seen.has(token)) { seen.add(token); out.push(token); }
  }
  return out.sort();
}

/** Token-bag of letters/digits AFTER folding and AFTER removing dosage tokens. */
function nameTokens(raw: string): string[] {
  const folded = foldArabic((raw ?? "").toLowerCase());
  // strip dosage tokens (with their unit) so they don't pollute the name bag
  const dosageStripped = folded.replace(
    /\d+(?:\.\d+)?\s*(?:mcg|µg|ug|mg|gm|gr|g|kg|ml|cc|l|iu|ui|mmol|%)\b/g,
    " ",
  );
  return dosageStripped
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

/**
 * Stable grouping key. Two products produce the same key iff:
 *   1) their dosage tokens are identical, AND
 *   2) their normalized name token-bag is identical.
 */
export function normalizeProductKey(raw: string): { key: string; dosages: string[]; tokens: string[] } {
  const dosages = extractDosages(raw);
  const tokens = nameTokens(raw);
  const key = `${tokens.join("_")}|${dosages.join("_")}`;
  return { key, dosages, tokens };
}
