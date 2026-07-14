import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft } from "lucide-react";
import { trackEvent } from "../analytics/track";

const previews = [
  { id: "hypertension", title: "ضغط الدم — دليل مبسّط", tag: "قلب وأوعية" },
  { id: "diabetes", title: "التعايش مع السكري", tag: "أمراض مزمنة" },
  { id: "kids-fever", title: "حرارة الأطفال متى نقلق؟", tag: "أطفال" },
];

export function HealthEducationPreview() {
  return (
    <section aria-labelledby="sahtak-heading" dir="rtl">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-violet-600" />
          <h2 id="sahtak-heading" className="text-lg font-black">صحتك — محتوى صحي موثوق</h2>
        </div>
        <Link
          to="/sahtak"
          onClick={() => trackEvent("cta_clicked", { source: "sahtak_preview", target: "index" })}
          className="text-xs font-bold text-primary hover:underline"
        >
          كل المقالات
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {previews.map((p) => (
          <li key={p.id}>
            <Link
              to="/sahtak"
              onClick={() => trackEvent("cta_clicked", { source: "sahtak_preview", id: p.id })}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="inline-flex w-fit rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">{p.tag}</span>
              <p className="text-sm font-black leading-snug">{p.title}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary">اقرأ المقال <ChevronLeft className="size-3.5" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HealthEducationPreview;
