import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductionReadinessSnapshot } from "@/lib/dashboard/production-readiness";

export const Route = createFileRoute("/_authenticated/admin-production-readiness")({
  head: () => ({
    meta: [
      { title: "جاهزية الإنتاج — MUSLLY AI OS" },
      { name: "description", content: "مراقبة صحة النظام والتكاملات والاستعداد للإنتاج." },
    ],
  }),
  component: ReadinessPage,
});

const statusTone: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  fail: "bg-red-500/15 text-red-500 border-red-500/30",
};

function ReadinessPage() {
  const fetchSnapshot = useServerFn(getProductionReadinessSnapshot);
  const { data, isLoading, error } = useQuery({
    queryKey: ["production-readiness"],
    queryFn: () => fetchSnapshot({ data: {} }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <p className="text-destructive">تعذّر تحميل التقرير: {(error as Error).message}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🚀 جاهزية الإنتاج</h1>
          <p className="text-sm text-muted-foreground">
            آخر تحديث: {new Date(data.generatedAt).toLocaleString("ar-EG")}
          </p>
        </div>
        <Badge className={`text-base px-4 py-1 border ${statusTone[data.overall]}`}>
          {data.overall === "pass" ? "✓ جاهز" : data.overall === "warn" ? "⚠ تحذير" : "✗ غير جاهز"}
        </Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {data.checks.map((c) => (
          <Card key={c.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{c.label}</CardTitle>
              <Badge className={`border ${statusTone[c.status]}`}>{c.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{c.detail ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">التكاملات الخارجية</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.integrations.map((i) => (
            <Card key={i.name}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.latencyMs}ms · {i.detail ?? ""}
                  </p>
                </div>
                <Badge className={`border ${i.ok ? statusTone.pass : statusTone.fail}`}>
                  {i.ok ? "up" : "down"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">أداء الـ API (p95)</h2>
        {data.api.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تُسجَّل بعد أي عيّنات في هذا الـ isolate.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-right p-2">المسار</th>
                  <th className="text-right p-2">عدد</th>
                  <th className="text-right p-2">p50</th>
                  <th className="text-right p-2">p95</th>
                  <th className="text-right p-2">p99</th>
                  <th className="text-right p-2">خطأ%</th>
                </tr>
              </thead>
              <tbody>
                {data.api.map((r) => (
                  <tr key={r.route} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.route}</td>
                    <td className="p-2">{r.count}</td>
                    <td className="p-2">{r.p50}ms</td>
                    <td className="p-2">{r.p95}ms</td>
                    <td className="p-2">{r.p99}ms</td>
                    <td className="p-2">{(r.errorRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Cron / خلفية</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {data.cron.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-mono text-xs">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.lastRun ? new Date(c.lastRun).toLocaleString("ar-EG") : "لم يُشغَّل بعد"}
                </p>
              </div>
              <Badge className={`border ${c.ok ? statusTone.pass : statusTone.warn}`}>
                {c.ok ? "healthy" : "stale"}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
