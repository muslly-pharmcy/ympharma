import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { businessInsights, type InsightSummary } from "@/lib/business-intel.functions";

export const Route = createFileRoute("/_authenticated/admin-business-intel")({
  head: () => ({
    meta: [
      { title: "📊 Business Intelligence — الذكاء التجاري" },
      {
        name: "description",
        content: "مركز قيادة الأعمال — رؤى مالية ومبيعات وسوق ومحرك تنفيذي.",
      },
    ],
  }),
  component: BiPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function Column({
  title,
  color,
  rows,
}: {
  title: string;
  color: string;
  rows: InsightSummary[];
}) {
  return (
    <div className="rounded-lg border border-teal-900/50 bg-black/40 p-4">
      <h3 className={`font-semibold mb-3 ${color}`}>{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا رؤى بعد.</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 8).map((r) => (
            <li
              key={r.id}
              className="text-sm border-b border-teal-900/30 pb-2 last:border-0"
            >
              <div>{r.summary}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString("ar-EG")} · ثقة{" "}
                {(r.confidence * 100).toFixed(0)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BiPage() {
  const fetchFn = useServerFn(businessInsights);
  const q = useSuspenseQuery({
    queryKey: ["business-intel"],
    queryFn: () => fetchFn(),
    refetchInterval: 30_000,
  });
  const { executive, financial, sales, market } = q.data;

  return (
    <div dir="rtl" className="p-6 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-teal-400">
          🌌 Business Intelligence Galaxy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Phase 6 — عقل الأعمال: مالي، مبيعات، سوق، تنفيذي.
        </p>
      </header>

      <section className="rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-950/60 to-slate-950 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">👔</span>
          <h2 className="text-xl font-semibold text-teal-200">ملخص AI CEO</h2>
        </div>
        {executive ? (
          <>
            <p className="text-lg mb-4">{executive.summary}</p>
            {executive.priorities.length > 0 ? (
              <ol className="space-y-2 list-decimal list-inside">
                {executive.priorities.map((p, i) => (
                  <li key={i} className="text-sm text-slate-200">{p}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                لم يتم توليد أولويات بعد.
              </p>
            )}
            <p className="text-xs text-teal-500 mt-4">
              الثقة: {(executive.confidence * 100).toFixed(0)}% ·{" "}
              {new Date(executive.created_at).toLocaleString("ar-EG")}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            لم يتم تشغيل تحليل CEO بعد. انتظر أول جولة cron أو نفذ يدوياً.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Column title="🏦 التحليل المالي" color="text-emerald-300" rows={financial} />
        <Column title="📈 المبيعات" color="text-teal-300" rows={sales} />
        <Column title="🌐 السوق" color="text-amber-300" rows={market} />
      </section>
    </div>
  );
}
