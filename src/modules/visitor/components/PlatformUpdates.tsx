// Phoenix Quick Execution — "آخر تحديثات المنصة" static, lazy-loaded card.
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Update = {
  id: string;
  date: string; // ISO
  title: string;
  summary: string;
  href?: string;
  tag?: string;
};

const UPDATES: Update[] = [
  {
    id: "doctors-network",
    date: "2026-07-01",
    title: "شبكة الأطباء انطلقت",
    summary: "ابحث عن أطباء موثوقين في عدن حسب التخصص، المدينة، والعيادة.",
    href: "/doctors",
    tag: "جديد",
  },
  {
    id: "doctor-join",
    date: "2026-07-10",
    title: "دعوة الأطباء للانضمام",
    summary: "طبيب؟ انضم إلى المنصة واستقبل مرضى جدد بعد التحقق.",
    href: "/doctor/join",
    tag: "للأطباء",
  },
  {
    id: "unified-search",
    date: "2026-06-20",
    title: "بحث موحّد أذكى",
    summary: "بحث عربي/إنجليزي عن الأدوية مع تصحيح تلقائي للأخطاء الشائعة.",
    href: "/products",
  },
  {
    id: "health-education",
    date: "2026-06-01",
    title: "قسم صحتك",
    summary: "محتوى صحي موثّق باللغة العربية لصحتك وصحة عائلتك.",
    href: "/sahtak",
  },
];

const FMT = new Intl.DateTimeFormat("ar", { year: "numeric", month: "short", day: "numeric" });

export function PlatformUpdates() {
  return (
    <section dir="rtl" aria-labelledby="platform-updates-title" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="platform-updates-title" className="flex items-center gap-2 text-xl font-black sm:text-2xl">
            <Sparkles className="size-5 text-primary" aria-hidden />
            آخر تحديثات المنصة
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">جديد المسلي على مدار الأسابيع الماضية</p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {UPDATES.map((u) => {
          const Card = (
            <article className="h-full rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/60">
              <div className="mb-2 flex items-center justify-between gap-2">
                <time dateTime={u.date} className="text-[11px] text-muted-foreground">
                  {FMT.format(new Date(u.date))}
                </time>
                {u.tag && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {u.tag}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black">{u.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{u.summary}</p>
              {u.href && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  اعرف المزيد <ArrowLeft className="size-3.5" aria-hidden />
                </div>
              )}
            </article>
          );
          return (
            <li key={u.id}>
              {u.href ? (
                <Link to={u.href} className="block">
                  {Card}
                </Link>
              ) : (
                Card
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PlatformUpdates;
