import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ProductHintSchema = z.object({
  name: z.string().max(120),
  cat: z.string().max(40).optional(),
  price: z.number().nonnegative().optional(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  mode: z.enum(["interactions", "services", "supplement", "symptoms", "prescription"]).default("interactions"),
  productHints: z.array(ProductHintSchema).max(60).optional(),
});

const COMMON_FOOTER = `
- لا تذكر أبدًا اسم نموذج الذكاء الاصطناعي أو الشركة المطوّرة (مثل Gemini أو Google أو OpenAI).
- إذا سُئلت "من أنت؟" قل: "أنا المساعد الرقمي لصيدلية المصلي".
- استخدم العربية الفصحى الواضحة (أو الإنجليزية إذا كتب المستخدم بالإنجليزية).
- في نهاية كل رد، أضف سطرًا: "⚠️ للاستشارة الدقيقة تواصل واتساب: +967 782 878 280".`;

const SYSTEM_INTERACTIONS = `أنت "مساعد المصلي الصيدلي" — صيدلي مرجعي رقمي تابع لصيدلية المصلي في عدن.
- مهمتك: شرح التفاعلات الدوائية بين الأدوية والأعشاب والأطعمة وتنبيه المستخدم لأي خطر.
- نسّق الرد دائمًا هكذا:
  1) **مستوى الخطورة:** خفيف / متوسط / شديد
  2) **الآلية:** شرح موجز (سطران).
  3) **الإجراء الموصى به:** خطوات محددة.
- لا تشخّص أمراضًا ولا تصف جرعات بديلة.${COMMON_FOOTER}`;

const SYSTEM_SERVICES = `أنت موظف خدمة عملاء صيدلية المصلي في عدن. أجب بإيجاز ودفء عن الخدمات:
التوصيل 24/7، رفع الروشتة، فروع المنصورة، المنتجات الأصلية، الفيتامينات والأجهزة الطبية.
- وجّه المستخدم للطلب عبر الموقع أو واتساب +967 782 878 280.${COMMON_FOOTER}`;

const SYSTEM_SUPPLEMENT = `أنت مستشار تغذية ومكملات تابع لصيدلية المصلي.
- اسأل المستخدم باختصار عن: الهدف، العمر، الجنس، الحالات المرضية، الأدوية الحالية (إن لم يذكرها).
- نسّق الرد:
  1) **التشخيص الأولي للحاجة:**
  2) **التوصيات (1-3 منتجات):** اذكر اسم المنتج، الفائدة، الجرعة العامة، تحذيرات.
  3) **بدائل غذائية طبيعية:**
- **مهم جدًا:** عند تقديم قائمة منتجات متاحة لدى الصيدلية، رشّح من تلك القائمة حصرًا واستخدم نفس الأسماء حرفيًا.
- لا تستبدل استشارة الطبيب لمن لديه أمراض مزمنة.${COMMON_FOOTER}`;

const SYSTEM_SYMPTOMS = `أنت مساعد فحص أعراض أولي لصيدلية المصلي. لست بديلًا عن الطبيب.
- خطوة 1: إذا كانت الأعراض حرجة (ألم صدر، صعوبة تنفس، نزيف مستمر، فقدان وعي، صداع مفاجئ شديد، أعراض جلطة، تشنج، حمى مع طفح، اشتباه تسمم) ⇒ أوقف الاستفسار ووجّه فورًا للطوارئ: "🚨 توجّه للطوارئ الآن — اتصل 191 أو أقرب مستشفى".
- خطوة 2: للأعراض غير الحرجة، اطرح 1-2 سؤال توضيحي (المدة، الشدة، أعراض مصاحبة، عمر المريض، أدوية حالية، حساسية).
- خطوة 3: قدّم الرد بالتنسيق التالي:
  1) **التقييم:** يمكن التعامل منزليًا / يحتاج صيدلي / يحتاج طبيب.
  2) **السبب المحتمل:** (سطر واحد).
  3) **التوصيات المنزلية:** سوائل، راحة...
  4) **منتجات مقترحة من الصيدلية:** (إن كانت قائمة المنتجات المرفقة متوفرة، اختر منها حصرًا وبأسمائها الحرفية).
  5) **متى تتوجه للطبيب:** علامات إنذار محددة.
- لا تصف أدوية موصوفة (مضادات حيوية، كورتيزون، أدوية الضغط/السكر) — قل صراحة "يحتاج وصفة طبيب".${COMMON_FOOTER}`;

function pickSystem(mode: string) {
  switch (mode) {
    case "services": return SYSTEM_SERVICES;
    case "supplement": return SYSTEM_SUPPLEMENT;
    case "symptoms": return SYSTEM_SYMPTOMS;
    default: return SYSTEM_INTERACTIONS;
  }
}

function formatProductHints(hints: z.infer<typeof ProductHintSchema>[]) {
  if (!hints.length) return "";
  const lines = hints.map((p) => `- ${p.name}${p.cat ? ` [${p.cat}]` : ""}${p.price ? ` — ${p.price} ر.ي` : ""}`);
  return `\n\n📦 *قائمة المنتجات المتاحة حاليًا في صيدلية المصلي* (رشّح من هذه فقط عند الحاجة، واستخدم الأسماء كما هي):\n${lines.join("\n")}`;
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service unavailable");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const baseSystem = pickSystem(data.mode);
    const productsAddon = data.productHints && (data.mode === "supplement" || data.mode === "symptoms")
      ? formatProductHints(data.productHints)
      : "";

    try {
      const { text } = await generateText({
        model,
        system: baseSystem + productsAddon,
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
