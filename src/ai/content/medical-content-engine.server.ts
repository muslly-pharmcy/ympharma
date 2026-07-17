import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const CATEGORIES_BY_DOW: Record<number, { key: string; ar: string }> = {
  0: { key: "awareness", ar: "توعية صحية عامة" },
  1: { key: "cardio", ar: "صحة القلب" },
  2: { key: "nutrition", ar: "التغذية العلاجية" },
  3: { key: "dental", ar: "صحة الأسنان" },
  4: { key: "child", ar: "صحة الأطفال" },
  5: { key: "medication_safety", ar: "سلامة الأدوية" },
  6: { key: "fitness", ar: "اللياقة والرياضة" },
};

const PostSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
});

export type GeneratedMedicalPost = z.infer<typeof PostSchema> & {
  category: string;
  language: "ar";
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

export async function generateDailyMedicalPost(): Promise<GeneratedMedicalPost> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const dow = new Date().getUTCDay();
  const cat = CATEGORIES_BY_DOW[dow];

  const gateway = createLovableAiGatewayProvider(apiKey);
  const prompt = `اكتب مقالة صحية توعوية موجزة باللغة العربية عن موضوع "${cat.ar}".
- العنوان جذاب ومحدد (لا يزيد عن 70 حرفاً).
- ملخص من سطرين.
- المحتوى من 250-400 كلمة، منظّم بعناوين فرعية Markdown (##) ونقاط عند الحاجة.
- أدرج تنبيهاً بأن المقالة ليست بديلاً عن الاستشارة الطبية.
- 3-6 وسوم قصيرة ذات صلة.
- الـ slug باللاتينية kebab-case.`;

  try {
    const { experimental_output: out } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      experimental_output: Output.object({ schema: PostSchema }),
      prompt,
    });
    return {
      ...out,
      slug: slugify(out.slug || out.title),
      category: cat.key,
      language: "ar",
    };
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      // Fallback: minimal stub so the cron doesn't fail
      return {
        title: `نصيحة اليوم: ${cat.ar}`,
        slug: `${cat.key}-${new Date().toISOString().slice(0, 10)}`,
        summary: "محتوى صحي توعوي مؤقت — قيد المراجعة.",
        content: `## ${cat.ar}\n\nمحتوى قيد التوليد، سيتم تحديثه قريباً.`,
        tags: [cat.key],
        category: cat.key,
        language: "ar",
      };
    }
    throw err;
  }
}
