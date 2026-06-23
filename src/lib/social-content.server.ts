// Generate marketing posts for social platforms using DeepSeek.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deepseekJson } from "./deepseek.server";

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "telegram";

export interface GeneratedPost {
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface DraftPost extends GeneratedPost {
  platform: SocialPlatform;
  product_id: string | null;
  status: "pending";
  scheduled_for: string;
}

const PLATFORM_STYLES: Record<SocialPlatform, string> = {
  facebook: "منشور طويل وجذاب مع دعوة للتفاعل، مناسب للعائلة والمجتمع",
  instagram: "كابشن قصير وجذاب مع إيموجيات، مناسب للصورة",
  twitter: "تغريدة مختصرة (حد أقصى 270 حرف بدون الهاشتاغات) مع نبرة مباشرة",
  telegram: "رسالة مباشرة وواضحة مع دعوة للتفاعل، مناسبة للقنوات",
};

function publicSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const SYSTEM_PROMPT = `أنت خبير تسويق رقمي متخصص في السوق اليمني والعربي تكتب لصيدلية المصلي.
- استخدم لهجة عربية فصحى مع لمسة يمنية دافئة.
- أضف إيموجيات مناسبة وقليلة (2-4).
- لا تذكر أسعاراً مخفّضة وهمية أو ادعاءات طبية مبالغة.
- أخرج النتيجة كـ JSON صالح فقط بهذا الشكل:
{"caption":"...","hashtags":["#...","#..."],"cta":"..."}`;

export async function generateProductPost(
  productName: string,
  productPrice: number | null,
  productDescription: string | null,
  platform: SocialPlatform,
): Promise<GeneratedPost> {
  const userPrompt = `المنتج: ${productName}
السعر: ${productPrice ? `${productPrice} ريال يمني` : "غير محدد"}
الوصف: ${productDescription || "منتج صحي عالي الجودة"}
المنصة: ${platform}
الأسلوب المطلوب: ${PLATFORM_STYLES[platform]}`;

  return deepseekJson<GeneratedPost>([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
}

export async function generateGeneralPost(platform: SocialPlatform): Promise<GeneratedPost> {
  const userPrompt = `اكتب منشوراً عاماً عن صيدلية المصلي للمنصة: ${platform}.
ركّز على: الجودة والثقة، خدمة العملاء، التنوع في المنتجات.
الأسلوب: ${PLATFORM_STYLES[platform]}`;

  return deepseekJson<GeneratedPost>([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
}

export async function pickRandomProduct(): Promise<{
  id: string;
  name: string;
  price: number | null;
  description: string | null;
} | null> {
  const sb = publicSupabase();
  // products table is public-readable via existing RLS; project the safe columns.
  const { data, error } = await sb
    .from("products")
    .select("id,name,price,description,stock_qty")
    .gt("stock_qty", 0)
    .order("stock_qty", { ascending: false })
    .limit(50);
  if (error || !data || data.length === 0) return null;

  const weights = data.map((p) => Math.max(1, Number(p.stock_qty) || 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < data.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const p = data[i];
      return { id: p.id, name: p.name, price: p.price ?? null, description: p.description ?? null };
    }
  }
  const p = data[0];
  return { id: p.id, name: p.name, price: p.price ?? null, description: p.description ?? null };
}

export const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "twitter", "telegram"];

export async function generateDailyDrafts(): Promise<DraftPost[]> {
  const product = await pickRandomProduct();
  const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const drafts: DraftPost[] = [];
  for (const platform of PLATFORMS) {
    try {
      const post = product
        ? await generateProductPost(product.name, product.price, product.description, platform)
        : await generateGeneralPost(platform);
      drafts.push({
        platform,
        product_id: product?.id ?? null,
        caption: String(post.caption ?? "").slice(0, 4000),
        hashtags: Array.isArray(post.hashtags) ? post.hashtags.slice(0, 12).map(String) : [],
        cta: String(post.cta ?? "").slice(0, 300),
        status: "pending",
        scheduled_for: scheduledFor,
      });
    } catch (e) {
      console.error("[social-content] generation failed", platform, e);
    }
  }
  return drafts;
}
