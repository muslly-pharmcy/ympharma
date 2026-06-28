import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";

const Input = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().optional(),
});

const Schema = z.object({
  summary: z.string().describe("جملة واحدة تختصر فائدة المنتج"),
  benefits: z.array(z.string()).min(3).max(7).describe("أهم الفوائد الصحية"),
  uses: z.array(z.string()).min(2).max(6).describe("الحالات والاستخدامات الأساسية"),
  dosage: z.string().min(10).describe("الجرعة العامة للبالغين باللغة العربية مع ذكر المدى الآمن"),
  warnings: z.array(z.string()).min(2).max(6).describe("تحذيرات وموانع الاستخدام والتفاعلات الدوائية"),
  sources: z.array(z.string()).min(1).max(4).describe("مصادر علمية موثوقة مثل WebMD, Mayo Clinic, NIH, Drugs.com"),
  disclaimer: z.string().describe("تنبيه طبي واضح بضرورة استشارة الطبيب"),
});

export type VitaminInfo = z.infer<typeof Schema>;

export const getVitaminInfo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const prompt = `أنت صيدلي خبير وموثوق. قدّم معلومات دقيقة وموجزة باللغة العربية الفصحى عن المنتج التالي:
الاسم: ${data.name}
${data.brand ? `العلامة التجارية: ${data.brand}` : ""}

التعليمات الإلزامية:
- summary: جملة واحدة فقط.
- benefits: فوائد علمية حقيقية فقط، لا ادعاءات مبالغ بها.
- uses: استخدامات شائعة وموثقة طبياً.
- dosage: اذكر الجرعة العامة للبالغين بوضوح (مثل: 1 قرص يومياً بعد الطعام)، وأشر إلى أن الجرعة قد تختلف حسب الحالة.
- warnings: 2 إلى 6 تحذيرات تشمل الحمل والرضاعة والتفاعلات الدوائية والآثار الجانبية.
- sources: 1 إلى 4 مصادر علمية موثوقة (Mayo Clinic, WebMD, NIH, Drugs.com, MedlinePlus).
- disclaimer: تنبيه طبي قصير بضرورة استشارة الطبيب أو الصيدلي قبل الاستخدام.

لا تخترع معلومات. عند الشك اكتب "يرجى مراجعة الطبيب".`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: Schema }),
        prompt,
      });
      return experimental_output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[vitamin-info] gemini failed", { name: data.name, brand: data.brand, msg });
      throw new Error(`فشل جلب معلومات المنتج: ${msg}`);
    }
  });
