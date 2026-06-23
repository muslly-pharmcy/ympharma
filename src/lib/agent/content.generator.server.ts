// Content Generator — Phase 2.
// Produces 3 variants per platform using Chain-of-Thought prompting against
// DeepSeek. The raw CoT is NOT persisted; only a short `decision_summary`
// and structured `decision_factors` are returned for explainability.
//
// Server-only.
import { deepseekJson } from "../deepseek.server";
import type { SocialPlatform } from "../social-content.server";
import type { AgentContext } from "./context.provider.server";
import { summarizeContextForPrompt } from "./context.provider.server";

export interface PostVariant {
  variant_id: string; // "v1" | "v2" | "v3"
  caption: string;
  hashtags: string[];
  cta: string;
  tone: string; // e.g. "ودودة", "مباشرة", "ملهمة"
}

export interface GenerationResult {
  variants: PostVariant[];
  decision_summary: string; // short, user-readable, NOT raw CoT
  decision_factors: Record<string, string | number>;
}

const PLATFORM_STYLES: Record<SocialPlatform, string> = {
  facebook: "منشور طويل وجذاب، نبرة عائلية ومجتمعية",
  instagram: "كابشن قصير مع إيموجيات مناسبة للصورة",
  twitter: "تغريدة مختصرة (≤270 حرف بدون الهاشتاغات)، نبرة مباشرة",
  telegram: "رسالة مباشرة وواضحة، مناسبة للقنوات",
};

const SYSTEM_PROMPT = `أنت خبير تسويق رقمي لصيدلية المصلي في اليمن.
قواعد:
- عربية فصحى دافئة، إيموجيات 2-4 كحد أقصى.
- لا أسعار مخفضة وهمية ولا ادعاءات طبية مبالغة.
- اتبع نمط Chain-of-Thought داخلياً: فكّر في 3 زوايا تسويقية مختلفة لكل منشور (مثل: الجودة، الحاجة الموسمية، توفير الوقت)، ثم اختر النبرة الأنسب لكل نموذج.
- لا تُظهر تفكيرك الخام في النص النهائي.
- أخرج JSON صالحاً فقط بهذا الشكل:
{
  "variants": [
    { "variant_id": "v1", "tone": "...", "caption": "...", "hashtags": ["#..."], "cta": "..." },
    { "variant_id": "v2", "tone": "...", "caption": "...", "hashtags": ["#..."], "cta": "..." },
    { "variant_id": "v3", "tone": "...", "caption": "...", "hashtags": ["#..."], "cta": "..." }
  ],
  "decision_summary": "جملة واحدة تشرح لماذا هذه الزوايا الثلاث مناسبة الآن (بدون كشف الـ CoT الخام)",
  "decision_factors": { "main_angle": "...", "secondary_angle": "...", "audience_signal": "..." }
}`;

export async function generateVariants(params: {
  platform: SocialPlatform;
  productName?: string | null;
  productPrice?: number | null;
  productDescription?: string | null;
  context?: AgentContext | null;
}): Promise<GenerationResult> {
  const { platform, productName, productPrice, productDescription, context } = params;

  const contextBlock = context ? `\n\nسياق فوري:\n${summarizeContextForPrompt(context)}` : "";
  const productBlock = productName
    ? `المنتج: ${productName}\nالسعر: ${productPrice ? `${productPrice} ريال يمني` : "غير محدد"}\nالوصف: ${productDescription || "منتج صحي عالي الجودة"}`
    : "منشور عام عن صيدلية المصلي (الجودة، الثقة، خدمة العملاء، التنوع).";

  const userPrompt = `${productBlock}
المنصة: ${platform}
الأسلوب المطلوب: ${PLATFORM_STYLES[platform]}${contextBlock}

ولّد 3 نماذج (variants) مختلفة بزوايا تسويقية متمايزة.`;

  const raw = await deepseekJson<GenerationResult>([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  // Sanitize / shape the result defensively (LLM may drift)
  const variants: PostVariant[] = Array.isArray(raw.variants) ? raw.variants.slice(0, 3) : [];
  const normalized = variants.map((v, i) => ({
    variant_id: String(v.variant_id || `v${i + 1}`).slice(0, 8),
    tone: String((v as any).tone || "غير محدد").slice(0, 30),
    caption: String(v.caption || "").slice(0, 4000),
    hashtags: Array.isArray(v.hashtags) ? v.hashtags.slice(0, 12).map(String) : [],
    cta: String(v.cta || "").slice(0, 300),
  }));

  return {
    variants: normalized,
    decision_summary: String(raw.decision_summary || "").slice(0, 500),
    decision_factors:
      raw.decision_factors && typeof raw.decision_factors === "object"
        ? (raw.decision_factors as Record<string, string | number>)
        : {},
  };
}
