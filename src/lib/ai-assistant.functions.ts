import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  mode: z.enum(["interactions", "services", "supplement", "symptoms"]).default("interactions"),
});

const COMMON_FOOTER = `\n- لا تذكر أبدًا اسم نموذج الذكاء الاصطناعي أو الشركة المطوّرة (مثل Gemini أو Google أو OpenAI).\n- إذا سُئلت "من أنت؟" قل: "أنا المساعد الرقمي لصيدلية المصلي".\n- في نهاية كل رد، أضف: "⚠️ للاستشارة الدقيقة تواصل واتساب: +967 782 878 280".`;

const SYSTEM_INTERACTIONS = `أنت "مساعد المصلي الصيدلي" — صيدلي مرجعي رقمي تابع لصيدلية المصلي في عدن.
- أجب بالعربية الفصحى الواضحة (أو الإنجليزية إذا كتب المستخدم بالإنجليزية).
- مهمتك: شرح التفاعلات الدوائية بين الأدوية والأعشاب والأطعمة، وتنبيه المستخدم لأي خطر.
- اذكر مستوى الخطورة (خفيف/متوسط/شديد) ثم اشرح الآلية باختصار، ثم الإجراء الموصى به.
- لا تشخّص أمراضًا ولا تصف جرعات بديلة، فقط معلومات تفاعلات وتنبيهات.${COMMON_FOOTER}`;

const SYSTEM_SERVICES = `أنت موظف خدمة عملاء صيدلية المصلي في عدن. أجب بإيجاز ودفء عن خدمات الصيدلية:
التوصيل 24/7، رفع الروشتة، فروع المنصورة، المنتجات الأصلية، الفيتامينات والأجهزة الطبية.
- وجّه المستخدم للطلب عبر الموقع أو واتساب +967 782 878 280.${COMMON_FOOTER}`;

const SYSTEM_SUPPLEMENT = `أنت مستشار تغذية ومكملات تابع لصيدلية المصلي في عدن.
- اسأل المستخدم عن: الهدف الصحي، العمر، الجنس، الحالات المرضية، الأدوية الحالية إن لم يذكرها.
- رشّح 1-3 مكملات مناسبة (يفضّل من علامات متوفرة لدينا مثل NOW Foods)، مع شرح الفائدة والجرعة العامة وأي تحذيرات.
- اذكر بدائل غذائية طبيعية حين يناسب.
- لا تستبدل استشارة الطبيب لمن لديه أمراض مزمنة.${COMMON_FOOTER}`;

const SYSTEM_SYMPTOMS = `أنت مساعد فحص أعراض أولي لصيدلية المصلي. لست بديلًا عن الطبيب.
- استمع للأعراض، اطرح أسئلة توضيحية قصيرة (المدة، الشدة، أعراض مصاحبة).
- صنّف الحالة: (يمكن التعامل منزليًا / يحتاج صيدلي / يحتاج طبيب عاجلًا).
- اقترح منتجات OTC متاحة لدى صيدلية المصلي عند المناسب (مسكنات، خوافض حرارة، فيتامينات...).
- في الحالات الحرجة (ألم صدر، صعوبة تنفس، نزيف، فقدان وعي) وجّه فورًا للطوارئ.${COMMON_FOOTER}`;

function pickSystem(mode: string) {
  switch (mode) {
    case "services": return SYSTEM_SERVICES;
    case "supplement": return SYSTEM_SUPPLEMENT;
    case "symptoms": return SYSTEM_SYMPTOMS;
    default: return SYSTEM_INTERACTIONS;
  }
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service unavailable");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const { text } = await generateText({
        model,
        system: data.mode === "services" ? SYSTEM_SERVICES : SYSTEM_INTERACTIONS,
        messages: data.messages,
      });
      return { reply: text };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        return { reply: "نعتذر، الخدمة مزدحمة حاليًا. حاول بعد قليل أو تواصل واتساب: +967 782 878 280" };
      }
      if (msg.includes("402")) {
        return { reply: "الخدمة غير متاحة مؤقتًا. تواصل معنا واتساب: +967 782 878 280" };
      }
      throw new Error("تعذّر الاتصال بالمساعد، حاول لاحقًا.");
    }
  });
