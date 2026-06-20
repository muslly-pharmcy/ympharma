import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope, ShieldAlert } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AiChat } from "@/components/ai-chat";

export const Route = createFileRoute("/ai-pharmacist")({
  head: () => ({
    meta: [
      { title: "الصيدلي الذكي — صيدلية المصلي" },
      { name: "description", content: "استشر الصيدلي الذكي لصيدلية المصلي: تحليل الأعراض الخفيفة، فحص التداخلات الدوائية، والتوصية بمنتجات OTC مناسبة." },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-pharmacist" }],
  }),
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20">
              <Stethoscope className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">الصيدلي الذكي</h1>
              <p className="text-xs text-white/85">استشارات فورية، فحص تداخلات الأدوية، وإرشادات الجرعات العامة</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            معلومات إرشادية ولا تغني عن استشارة الطبيب أو الصيدلي المختص. في حالات الطوارئ اتصل بالطوارئ فوراً.
          </p>
        </header>
        <AiChat
          mode="pharmacist"
          greeting="مرحباً بك في قسم الاستشارات الطبية الذكية لصيدلية مسلي. 🌿\nأنا هنا لمساعدتك في تحليل الأعراض الخفيفة، واقتراح المكملات والأدوية اللاوصفية المناسبة، والتحقق من التداخلات الدوائية. كيف يمكنني مساعدتك اليوم؟"
          placeholder="اكتب الأعراض التي تشعر بها أو الأدوية التي تريد فحص تداخلاتها..."
          suggestions={[
            "أشعر بصداع مستمر مع حرارة خفيفة",
            "هل يمكنني أخذ الباراسيتامول مع المضاد الحيوي؟",
            "ما الفيتامينات المناسبة لتقوية المناعة؟",
            "أعاني من ألم في المعدة بعد الأكل",
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  ),
});
