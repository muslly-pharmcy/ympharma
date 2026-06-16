import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope, ShieldAlert } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AiChat } from "@/components/ai-chat";

export const Route = createFileRoute("/ai-symptoms")({
  head: () => ({
    meta: [
      { title: "فحص الأعراض الأولي — صيدلية المصلي" },
      { name: "description", content: "صف أعراضك واحصل على تقييم أولي وتوصية بمنتجات OTC مناسبة من صيدلية المصلي." },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-symptoms" }],
  }),
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Stethoscope className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">فحص الأعراض الأولي</h1>
              <p className="text-xs text-white/85">مساعد صيدلية المصلي — تقييم أولي وتوصية</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            هذه أداة إرشادية وليست بديلًا عن الطبيب. في الحالات الحرجة اتصل بالطوارئ فورًا.
          </p>
        </header>
        <AiChat
          mode="symptoms"
          greeting="أهلاً 👋 صف لي أعراضك بالتفصيل: ما تشعر به، منذ متى، وشدته، وسأقيّم لك الحالة وأرشّح المنتج المناسب من صيدلية المصلي."
          placeholder="مثال: صداع منذ يومين مع حرارة..."
          waMessage="استفسار عن أعراض"
          suggestions={[
            "صداع وحمى منذ يومين",
            "ألم في الحلق وسعال",
            "ألم في المعدة بعد الأكل",
            "أرق مستمر",
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  ),
});
