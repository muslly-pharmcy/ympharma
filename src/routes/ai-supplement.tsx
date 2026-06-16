import { createFileRoute } from "@tanstack/react-router";
import { PillBottle, ShieldAlert } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AiChat } from "@/components/ai-chat";

export const Route = createFileRoute("/ai-supplement")({
  head: () => ({
    meta: [
      { title: "توصية المكملات الذكية — صيدلية المصلي" },
      { name: "description", content: "احصل على توصية شخصية بمكملات NOW Foods والفيتامينات المناسبة لهدفك الصحي من مستشار صيدلية المصلي." },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-supplement" }],
  }),
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><PillBottle className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">توصية المكملات الشخصية</h1>
              <p className="text-xs text-white/85">مستشار صيدلية المصلي — متاح 24/7</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            أخبرنا عن هدفك الصحي وحالتك العامة، ونرشّح لك المكمل الأنسب.
          </p>
        </header>
        <AiChat
          mode="supplement"
          greeting="أهلاً بك 👋 أنا مستشار المكملات في صيدلية المصلي.\nأخبرني عن: هدفك (طاقة، مناعة، شعر، عضلات...)، عمرك، وحالتك الصحية، وسأرشّح لك الأنسب."
          placeholder="مثال: أحتاج فيتامين للطاقة، عمري 30..."
          waMessage="أحتاج توصية بمكمل غذائي"
          suggestions={[
            "أحتاج فيتامين للمناعة",
            "مكمل لتساقط الشعر",
            "أوميغا 3 وأين أجدها؟",
            "فيتامين د للأطفال",
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  ),
});
