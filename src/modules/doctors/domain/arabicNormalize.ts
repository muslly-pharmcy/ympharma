// Arabic text normalization for search — pure, isomorphic.
// Strip tashkeel/tatweel, unify hamza/alef/yaa/haa forms, collapse whitespace.

const TASHKEEL = /[\u064B-\u065F\u0670\u0640]/g;
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u0622\u0623\u0625\u0671]/g, "ا"], // آ أ إ ٱ → ا
  [/\u0649/g, "ي"], // ى → ي
  [/\u0629/g, "ه"], // ة → ه
  [/\u0624/g, "و"], // ؤ → و
  [/\u0626/g, "ي"], // ئ → ي
];

// Common regional/spelling variants (Yemeni Arabic).
const VARIANTS: Record<string, string> = {
  "المنصوره": "المنصورة",
  "المنصورة": "المنصورة",
  "كريتر": "كريتر",
  "خورمكسر": "خورمكسر",
  "التواهي": "التواهي",
  "المعلا": "المعلا",
  "الشيخ عثمان": "الشيخ عثمان",
  "دار سعد": "دار سعد",
  "باطنيه": "باطنية",
  "باطنية": "باطنية",
  "اطفال": "أطفال",
  "نساء": "نساء",
  "توليد": "توليد",
  "عظام": "عظام",
  "قلب": "قلبية",
  "قلبية": "قلبية",
  "جلديه": "جلدية",
  "جلدية": "جلدية",
  "اسنان": "أسنان",
  "عيون": "عيون",
  "انف": "أنف",
  "اذن": "أذن",
  "حنجره": "حنجرة",
  "حنجرة": "حنجرة",
  "مسالك": "مسالك",
  "اعصاب": "أعصاب",
  "غده": "غدة",
  "غدة": "غدة",
  "سكر": "سكري",
  "سكري": "سكري",
  "دكتور": "د",
  "طبيب": "د",
  "د.": "د",
};

export function normalizeAr(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).trim().toLowerCase();
  s = s.replace(TASHKEEL, "");
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function expandVariants(term: string): string[] {
  const n = normalizeAr(term);
  const out = new Set<string>([n]);
  for (const [k, v] of Object.entries(VARIANTS)) {
    const nk = normalizeAr(k);
    const nv = normalizeAr(v);
    if (n.includes(nk)) out.add(n.replace(nk, nv));
    if (n.includes(nv)) out.add(n.replace(nv, nk));
  }
  return [...out].filter(Boolean);
}

export function matchesAr(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  const h = normalizeAr(haystack);
  const variants = expandVariants(needle);
  return variants.some((v) => v && h.includes(v));
}
