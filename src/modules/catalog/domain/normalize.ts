// Phoenix Phase 4 — Arabic normalization (TS mirror of public.catalog_normalize_ar).
// Keep in sync with SQL: strips tashkeel, unifies alef/ya/ta-marbuta/hamza forms,
// removes tatweel, collapses whitespace, lowercases.
const TASHKEEL = /[\u064B-\u0652\u0670]/g;
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/[أإآٱ]/g, "ا"],
  [/ى/g, "ي"],
  [/ة/g, "ه"],
  [/ؤ/g, "و"],
  [/ئ/g, "ي"],
  [/ـ/g, ""],
];

export function normalizeAr(input: string | null | undefined): string {
  if (!input) return "";
  let out = input.replace(TASHKEEL, "");
  for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
  return out.replace(/\s+/g, " ").trim().toLowerCase();
}
