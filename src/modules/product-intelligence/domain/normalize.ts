// Phoenix P7-A — Product Intelligence normalization engine.
// Single source of truth for Arabic + Latin medicine query normalization.
// Pure functions, no dependencies. Mirrors public.catalog_normalize_ar in SQL.

const TASHKEEL = /[\u064B-\u0652\u0670]/g;
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;
const ARABIC_LETTER_MAP: Array<[RegExp, string]> = [
  [/[أإآٱ]/g, "ا"],
  [/ى/g, "ي"],
  [/ة/g, "ه"],
  [/ؤ/g, "و"],
  [/ئ/g, "ي"],
  [/ـ/g, ""], // tatweel
];
// Keep letters + digits (Arabic + Latin) and spaces; drop everything else.
const NON_WORD = /[^\p{L}\p{N}\s]/gu;

export function normalize(input: string | null | undefined): string {
  if (!input) return "";
  let out = String(input).replace(ZERO_WIDTH, "").replace(TASHKEEL, "");
  for (const [re, to] of ARABIC_LETTER_MAP) out = out.replace(re, to);
  out = out.replace(NON_WORD, " ");
  return out.replace(/\s+/g, " ").trim().toLowerCase();
}

// Canonical token maps. Kept small; extend via alias table over time.
const CANONICAL_MAP: Record<string, string> = {
  vit: "vitamin",
  "vit.": "vitamin",
  vits: "vitamin",
  فيتامين: "vitamin",
  فتامين: "vitamin",
  فتمين: "vitamin",
  فايتمن: "vitamin",
  ڤيتامين: "vitamin",
  بنادول: "panadol",
  باندول: "panadol",
  بندول: "panadol",
  بارسيتامول: "paracetamol",
  باراسيتامول: "paracetamol",
  باراستمول: "paracetamol",
  ايبوبروفين: "ibuprofen",
  ابوبروفين: "ibuprofen",
  بروفين: "brufen",
  اموكسيسيلين: "amoxicillin",
  اموكسسلين: "amoxicillin",
  اموكسلين: "amoxicillin",
  اوجمنتين: "augmentin",
  اجمنتين: "augmentin",
  اومبرازول: "omeprazole",
  امبرازول: "omeprazole",
  زنك: "zinc",
  حديد: "iron",
  كالسيوم: "calcium",
  مغنيسيوم: "magnesium",
  مغنسيوم: "magnesium",
  اوميغا: "omega",
  اوميجا: "omega",
  بروبيوتك: "probiotic",
  بروبيوتيك: "probiotic",
  انسولين: "insulin",
  ميتفورمين: "metformin",
  سي: "c",
  دي: "d",
  بي: "b",
};

const BIGRAM_MAP: Record<string, string> = {
  "vitamin c": "vitamin_c",
  "vitamin d": "vitamin_d",
  "vitamin b": "vitamin_b",
  "vitamin b12": "vitamin_b12",
  "vitamin b 12": "vitamin_b12",
};

export function tokenize(input: string | null | undefined): string[] {
  const n = normalize(input);
  if (!n) return [];
  const raw = n.split(" ").filter(Boolean).map((t) => CANONICAL_MAP[t] ?? t);
  // Try to fold bigrams first, greedy left-to-right.
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const pair = i + 1 < raw.length ? `${raw[i]} ${raw[i + 1]}` : "";
    if (pair && BIGRAM_MAP[pair]) {
      out.push(BIGRAM_MAP[pair]);
      i++;
    } else {
      out.push(raw[i]);
    }
  }
  return out;
}

export function canonicalQuery(input: string | null | undefined): string {
  return tokenize(input).join(" ");
}
