import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldAlert, Upload } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AiChat } from "@/components/ai-chat";

export const Route = createFileRoute("/ai-prescription")({
  head: () => ({
    meta: [
      { title: "مساعد رفع الروشتة الطبية — صيدلية المصلي" },
      { name: "description", content: "مساعد ذكي يرشدك خطوة بخطوة لرفع روشتتك الطبية بشكل صحيح وآمن على منصة صيدلية المصلي." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-prescription" }],
  }),
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><FileText className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">مساعد رفع الروشتة الطبية</h1>
              <p className="text-xs text-white/85">إرشاد ذكي خطوة بخطوة — متوافق مع أعلى معايير الخصوصية</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            معلومات إرشادية — لا تغني عن الصيدلي المختص. الصور تُحفظ بصورة مُشفّرة في تخزين آمن.
          </p>
        </header>

        <Link
          to="/prescription"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
        >
          <span className="flex items-center gap-2"><Upload className="size-5" /> ابدأ رفع الروشتة الآن</span>
          <span className="text-xs font-bold">JPEG / PNG / PDF — حد أقصى 5MB</span>
        </Link>

        <AiChat
          mode="prescription"
          greeting={"مرحبًا بك 👋\nأنا مساعدك الذكي لرفع الروشتة الطبية على منصة صيدلية المصلي.\n\nيمكنني إرشادك خطوة بخطوة، أو الإجابة عن أي سؤال يخص: متطلبات الصورة، صلاحية الروشتة، طرق التتبع، أو أنواع الأدوية التي تحتاج وصفة."}
          placeholder="اسأل عن رفع الروشتة، الصيغ المقبولة، أو حالة طلبك..."
          suggestions={[
            "كيف أرفع روشتتي بشكل صحيح؟",
            "ما الصيغ والأحجام المسموحة؟",
            "هذا الدواء يحتاج وصفة؟",
            "متى تصل الطلبية بعد الرفع؟",
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  ),
});
