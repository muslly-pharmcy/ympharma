import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HeartPulse, Sparkles, Stethoscope } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/sahtak")({
  component: SahtakPage,
  head: () => ({
    meta: [
      { title: "صحتك — نصائح ومقالات طبية من صيدلية المصلي" },
      { name: "description", content: "مقالات ونصائح صحية موثوقة بإشراف أطباء وصيادلة. قسم صحتك من صيدلية المصلي." },
      { property: "og:title", content: "صحتك — نصائح ومقالات طبية" },
      { property: "og:description", content: "محتوى تثقيفي بإشراف مختصين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SECTIONS = [
  { icon: BookOpen, title: "مقالات صحية", desc: "قريباً — سلسلة مقالات موثّقة بإشراف مختصين." },
  { icon: HeartPulse, title: "نصائح يومية", desc: "قريباً — نصائح مختصرة للحياة الصحية." },
  { icon: Stethoscope, title: "من الأطباء", desc: "قريباً — محتوى مباشر من أطباء الشبكة." },
];

function SahtakPage() {
  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 rounded-2xl bg-gradient-to-l from-primary/10 to-transparent p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary-deep" />
            <h1 className="text-2xl font-black">صحتك</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            محتوى تثقيفي موثّق يجمع بين خبرة الأطباء والصيادلة. نبني هذا القسم تدريجياً — تابعنا.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-dashed border-border bg-card p-5 shadow-sm">
              <Icon className="mb-2 size-6 text-primary-deep" />
              <h2 className="text-base font-black">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="font-bold">هل تبحث عن طبيب؟</p>
          <p className="mt-1 text-muted-foreground">
            استعرض <Link to="/doctors" search={{}} className="text-primary-deep underline">دليل الأطباء</Link> لاختيار المختص المناسب.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
