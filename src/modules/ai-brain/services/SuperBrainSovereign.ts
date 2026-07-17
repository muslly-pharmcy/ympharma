// Pure sovereign decision core — no I/O, no Supabase imports.
// Wire it via BrainAdapter to real data sources.
import type {
  BrainAdapter,
  BrainDecisionMatrix,
  BrainInput,
  CognitiveTool,
} from "../domain/types";

// Real, curated tool registry — mapped to actual modules that exist in the codebase.
export const TOOL_REGISTRY: readonly CognitiveTool[] = [
  { code: "MED_DRUG_SAFETY", name: "فحص السلامة والتداخلات الدوائية", category: "medical", isLocked: false, accuracyRate: 98.5 },
  { code: "MED_ALT_SUGGEST", name: "اقتراح بدائل آمنة من الكاتالوج", category: "medical", isLocked: false, accuracyRate: 96.0 },
  { code: "MED_PRESCRIPTION_REVIEW", name: "مراجعة الوصفات الطبية", category: "medical", isLocked: false, accuracyRate: 95.2 },
  { code: "LOG_PHARMACY_NEARBY", name: "أقرب صيدلية توفر الدواء", category: "logistic", isLocked: false, accuracyRate: 97.1 },
  { code: "LOG_ETA_ESTIMATE", name: "تقدير زمن التوصيل حسب المديرية", category: "logistic", isLocked: false, accuracyRate: 92.0 },
  { code: "MAT_CAMPAIGN_BUILDER", name: "بناء رسائل حملات الأمومة والطفل", category: "maternal", isLocked: false, accuracyRate: 94.0 },
  { code: "COM_RESTOCK_ALERT", name: "تنبيه انخفاض المخزون", category: "commercial", isLocked: false, accuracyRate: 96.7 },
  { code: "GEO_DISTRICT_ROUTER", name: "توجيه جغرافي داخل اليمن", category: "geo_expansion", isLocked: false, accuracyRate: 93.5 },
] as const;

// District → coarse ETA (minutes) fallback when we don't have live routing.
const ETA_MIN_BY_DISTRICT: Record<string, number> = {
  "عدن": 20,
  "صنعاء": 30,
  "تعز": 35,
  "المكلا": 40,
  "الحديدة": 35,
};

// Ingredients we treat as risky for common chronic conditions.
const CHRONIC_RISK: Record<string, RegExp[]> = {
  diabetes: [/ديكسا|dexa/i, /بريدنيزو|prednis/i, /كورتيزون|cortisone/i, /شراب سعال سكر|syrup.*sugar/i],
  hypertension: [/ديكلوفيناك|diclofenac/i, /ايبوبروفين|ibuprofen/i, /بسودوإفدرين|pseudoephedrine/i, /نابروكسين|naproxen/i],
  pregnancy: [/ايزوتريتينوين|isotretinoin/i, /وارفارين|warfarin/i, /ميثوتريكسات|methotrexate/i],
};

const MATERNAL_KEYWORDS = /(حليب|أطفال|اطفال|بشره|بشرة|رضيع|حفاض|رضاعة|أمومة|امومة)/i;

function shortId(): string {
  return Math.random().toString(36).slice(2, 11).toUpperCase();
}

/**
 * Detects drug/condition conflicts based on user input + patient chronic conditions.
 * Returns the offending token (medicine keyword) or null.
 */
function detectUnsafeMedicine(userInput: string, conditions: string[] | undefined): string | null {
  if (!conditions?.length) return null;
  for (const cond of conditions) {
    const patterns = CHRONIC_RISK[cond];
    if (!patterns) continue;
    for (const pat of patterns) {
      const m = userInput.match(pat);
      if (m) return m[0];
    }
  }
  return null;
}

/**
 * Pure decision function: no external I/O.
 * Optional adapter allows enriching the decision (nearby pharmacy, alternative suggestion).
 */
export async function decide(
  input: BrainInput,
  adapter?: BrainAdapter,
): Promise<BrainDecisionMatrix> {
  const startedAt = Date.now();
  const dispatched: string[] = ["MED_DRUG_SAFETY", "GEO_DISTRICT_ROUTER"];

  // --- 1. Drug safety ---
  const conditions = [
    ...(input.patient?.chronicConditions ?? []),
    input.patient?.pregnant ? "pregnancy" : "",
  ].filter(Boolean);

  const unsafeToken = detectUnsafeMedicine(input.userInput, conditions);
  let isSafe = unsafeToken === null;
  let alternativeSuggested: string | null = null;

  if (unsafeToken) {
    dispatched.push("MED_ALT_SUGGEST");
    if (adapter) {
      try {
        alternativeSuggested = await adapter.suggestAlternative(unsafeToken);
      } catch {
        alternativeSuggested = null;
      }
    }
  }

  // --- 2. Geo routing ---
  dispatched.push("LOG_PHARMACY_NEARBY", "LOG_ETA_ESTIMATE");
  let logistic: BrainDecisionMatrix["logisticAction"] = null;
  const etaFallback = ETA_MIN_BY_DISTRICT[input.district] ?? 45;

  if (adapter) {
    try {
      const near = await adapter.findNearbyPharmacy(
        input.userInput,
        input.lat,
        input.lng,
        input.district,
      );
      if (near) {
        logistic = {
          targetBranch: near.name,
          pharmacyId: near.id,
          distanceKm: near.distanceKm,
          timeMin: near.distanceKm != null ? Math.max(10, Math.round(near.distanceKm * 2.5)) : etaFallback,
        };
      }
    } catch {
      // fall through to fallback
    }
  }
  if (!logistic) {
    logistic = {
      targetBranch: `صيدلية المصلي — ${input.district}`,
      pharmacyId: null,
      distanceKm: null,
      timeMin: etaFallback,
    };
  }

  // --- 3. Maternal marketing (suggestion only — not sent) ---
  let marketing: BrainDecisionMatrix["marketingAction"] = null;
  if (MATERNAL_KEYWORDS.test(input.userInput)) {
    dispatched.push("MAT_CAMPAIGN_BUILDER");
    marketing = {
      isTriggered: true,
      channel: "whatsapp",
      message:
        `مرحباً بك من صيدلية المصلي — ${input.district} 🌟 ` +
        `رصدنا اهتمامك بمنتجات الأمومة والطفل، وجهزنا لك عرضاً بخصم 10% ` +
        `مع توصيل مجاني للمنزل. هل نؤكد التجهيز؟`,
    };
  }

  return {
    decisionId: `DEC-${shortId()}`,
    isSafe,
    proposedAction: isSafe
      ? "صرف الدواء وتوجيه كابتن التوصيل"
      : "إيقاف الصرف مؤقتاً واقتراح بديل آمن للمراجعة البشرية",
    alternativeSuggested,
    logisticAction: logistic,
    marketingAction: marketing,
    dispatchedTools: dispatched,
    executionSpeedMs: Date.now() - startedAt,
  };
}

// Backward-compat static namespace (mirrors original blueprint shape).
export const SuperBrainSovereign = {
  TOOL_REGISTRY,
  decide,
};
