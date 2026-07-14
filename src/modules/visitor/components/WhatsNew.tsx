import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { whatsNew } from "../data/whats-new";
import { trackEvent } from "../analytics/track";

const TAG_STYLES: Record<string, string> = {
  "جديد": "bg-emerald-100 text-emerald-700",
  "تحديث": "bg-sky-100 text-sky-700",
  "مقال": "bg-violet-100 text-violet-700",
  "خدمة": "bg-amber-100 text-amber-800",
};

export function WhatsNew() {
  return (
    <section aria-labelledby="whats-new-heading" dir="rtl">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 id="whats-new-heading" className="text-lg font-black">آخر المستجدات</h2>
        </div>
        <span className="text-xs text-muted-foreground">تحديثات الخدمة والمحتوى</span>
      </div>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {whatsNew.map((item) => (
          <li key={item.id} className="min-w-[80%] snap-start sm:min-w-0">
            <Link
              to={item.href}
              onClick={() => trackEvent("cta_clicked", { source: "whats_new", id: item.id })}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_STYLES[item.tag] ?? "bg-muted"}`}>{item.tag}</span>
                <time className="text-[11px] text-muted-foreground">{item.date}</time>
              </div>
              <p className="text-sm font-black leading-snug">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WhatsNew;
