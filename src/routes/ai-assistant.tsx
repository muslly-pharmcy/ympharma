import { createFileRoute } from "@tanstack/react-router";
import { Brain, ShieldAlert } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AiChat } from "@/components/ai-chat";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "استشارة التفاعلات الدوائية — صيدلية المصلي" },
      { name: "description", content: "اسأل المساعد الصيدلي الرقمي لصيدلية المصلي عن التفاعلات بين الأدوية والأعشاب والأطعمة." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-assistant" }],
  }),
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl brand-gradient p-5 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Brain className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">استشارة التفاعلات الدوائية</h1>
              <p className="text-xs text-white/85">مساعد صيدلية المصلي الرقمي — متاح 24/7</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            معلومات إرشادية ولا تغني عن استشارة الصيدلي المختص.
          </p>
        </header>
        <AiChat
          mode="interactions"
          greeting="أهلاً بك في صيدلية المصلي 👋\nاسألني عن أي تفاعل دوائي بين دوائين، أو دواء وعشبة، أو دواء وطعام، وسأوضح لك مستوى الخطورة والإجراء الموصى به."
          placeholder="اكتب اسم الدوائين أو العشبة..."
          suggestions={[
            "هل يمكن أخذ الباراسيتامول مع الإيبوبروفين؟",
            "تفاعل الوارفارين مع الزنجبيل؟",
            "هل يؤثر العصير على دواء الضغط؟",
            "متى آخذ الحديد مع الكالسيوم؟",
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  ),
});
