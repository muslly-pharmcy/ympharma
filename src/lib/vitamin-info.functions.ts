import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().optional(),
});

const Schema = z.object({
  summary: z.string().describe("جملة واحدة تختصر فائدة المنتج"),
  benefits: z.array(z.string()).min(3).max(7).describe("أهم الفوائد الصحية"),
  uses: z.array(z.string()).min(2).max(6).describe("الحالات والاستخدامات الأساسية"),
  dosage: z.string().describe("الجرعة العامة للبالغين باللغة العربية"),
  warnings: z.array(z.string()).min(1).max(5).describe("تحذيرات وموانع الاستخدام"),
});

export const getVitaminInfo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const prompt = `أنت صيدلي خبير. قدّم معلومات دقيقة وموجزة باللغة العربية الفصحى عن المنتج التالي:
الاسم: ${data.name}
${data.brand ? `العلامة التجارية: ${data.brand}` : ""}

أعد إجابة منظمة (summary, benefits, uses, dosage, warnings). تجنّب الادعاءات الطبية المبالغ بها، وذكّر دائماً باستشارة الطبيب في الحالات الخاصة.`;

    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      experimental_output: Output.object({ schema: Schema }),
      prompt,
    });
    return experimental_output;
  });
