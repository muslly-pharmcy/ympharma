import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { securityOverview } from "@/lib/security-guardian.functions";

export const Route = createFileRoute("/_authenticated/admin-security-guardian")({
  head: () => ({
    meta: [
      { title: "🛡 Security Guardian — الحارس الأمني" },
      {
        name: "description",
        content: "مراقبة أمنية شاملة: أحداث، تدقيق، مخاطر، سلوك غير طبيعي.",
      },
    ],
  }),
  component: GuardianPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

const SEV_COLOR: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-500",
};

function GuardianPage() {
  const fetchFn = useServerFn(securityOverview);
  const q = useSuspenseQuery({
    queryKey: ["security-guardian"],
    queryFn: () => fetchFn(),
    refetchInterval: 20_000,
  });
  const { events, audit, heatmap } = q.data;
  const openEvents = events.filter((e) => !e.resolved);

  return (
    <div dir="rtl" className="p-6 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-red-400">🛡 Titan Security Guardian</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Phase 7 — المناعة الذاتية: كشف، تدقيق، استجابة.
        </p>
      </header>

      {/* Open events */}
      <section className="rounded-lg border border-red-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">
          🚨 أحداث مفتوحة ({openEvents.length})
        </h2>
        {openEvents.length === 0 ? (
          <p className="text-sm text-emerald-400">✅ لا أحداث نشطة.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-right text-muted-foreground">
              <tr>
                <th className="py-2">النوع</th>
                <th>الخطورة</th>
                <th>المخاطر</th>
                <th>الإجراء</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {openEvents.map((e) => (
                <tr key={e.id} className="border-t border-red-900/20">
                  <td className="py-2 font-mono text-xs">{e.event_type}</td>
                  <td className={SEV_COLOR[e.severity] ?? ""}>● {e.severity}</td>
                  <td>{e.risk_score}</td>
                  <td>{e.action_taken ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Heatmap */}
      <section className="rounded-lg border border-red-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">📊 خريطة المخاطر (7 أيام)</h2>
        {heatmap.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا بيانات كافية.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {heatmap.map((h) => (
              <div
                key={`${h.event_type}-${h.severity}`}
                className="rounded border border-red-900/30 p-3 bg-slate-950/40"
              >
                <div className="text-xs font-mono">{h.event_type}</div>
                <div className={`text-sm mt-1 ${SEV_COLOR[h.severity] ?? ""}`}>
                  {h.severity}: <span className="font-bold">{h.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit trail */}
      <section className="rounded-lg border border-red-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">
          📝 سجل التدقيق ({audit.length})
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا سجلات.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-muted-foreground">
                <tr>
                  <th className="py-2">الفاعل</th>
                  <th>الإجراء</th>
                  <th>المورد</th>
                  <th>النتيجة</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-red-900/20">
                    <td className="py-2 font-mono text-xs text-red-300">
                      {a.actor ?? "—"}
                    </td>
                    <td className="font-mono text-xs">{a.action}</td>
                    <td className="text-xs">{a.resource ?? "—"}</td>
                    <td className="text-xs">{a.result ?? "—"}</td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
