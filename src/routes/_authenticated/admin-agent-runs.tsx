import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getAgentRuns,
  getAgentRecommendations,
  getActiveAgentAlerts,
} from "@/lib/agent-runs.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin-agent-runs")({
  component: AdminAgentRuns,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <ErrorComponent error={error} />
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

function statusTone(status: string) {
  if (status === "ok") return "bg-emerald-100 text-emerald-700";
  if (status === "warn") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function severityTone(sev: string) {
  if (sev === "critical") return "bg-rose-600 text-white";
  if (sev === "high") return "bg-orange-500 text-white";
  if (sev === "medium") return "bg-amber-400 text-black";
  return "bg-slate-300 text-black";
}

function AdminAgentRuns() {
  const [hours, setHours] = useState<12 | 24>(24);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRuns = useServerFn(getAgentRuns);
  const fetchRecs = useServerFn(getAgentRecommendations);
  const fetchAlerts = useServerFn(getActiveAgentAlerts);

  const runsQ = useQuery({
    queryKey: ["agent-runs", hours],
    queryFn: () => fetchRuns({ data: { hours } }),
  });
  const recsQ = useQuery({
    queryKey: ["agent-recs", hours],
    queryFn: () => fetchRecs({ data: { hours } }),
  });
  const alertsQ = useQuery({
    queryKey: ["agent-alerts-active"],
    queryFn: () => fetchAlerts(),
    refetchInterval: 60_000,
  });

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">سجلات تشغيل الوكلاء</h1>
          <p className="text-sm text-muted-foreground">
            تفاصيل آخر {hours} ساعة لكل وكيل: القرارات، التوصيات، أسبابها.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={hours === 12 ? "default" : "outline"} onClick={() => setHours(12)}>
            12 ساعة
          </Button>
          <Button variant={hours === 24 ? "default" : "outline"} onClick={() => setHours(24)}>
            24 ساعة
          </Button>
        </div>
      </header>

      {/* Active alerts */}
      <section>
        <h2 className="font-semibold mb-2">التنبيهات النشطة</h2>
        {alertsQ.isLoading ? (
          <p className="text-sm">جارٍ التحميل…</p>
        ) : alertsQ.data?.alerts?.length ? (
          <div className="grid gap-2">
            {alertsQ.data.alerts.map((a: any) => (
              <Card key={a.alert_key} className="p-3 flex items-center justify-between">
                <div>
                  <Badge className={severityTone(a.severity)}>{a.severity}</Badge>
                  <span className="mx-2 font-medium">{a.agent}</span>
                  <span>{a.message}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-700">✅ لا توجد تنبيهات نشطة</p>
        )}
      </section>

      {/* Runs */}
      <section>
        <h2 className="font-semibold mb-2">عمليات التشغيل ({runsQ.data?.runs.length ?? 0})</h2>
        {runsQ.isLoading ? (
          <p>جارٍ التحميل…</p>
        ) : (
          <div className="space-y-2">
            {runsQ.data?.runs.map((r: any) => {
              const isOpen = expanded === r.id;
              return (
                <Card key={r.id} className="p-3">
                  <button
                    className="w-full text-right flex flex-wrap items-center gap-2"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <Badge className={statusTone(r.status)}>{r.status}</Badge>
                    <span className="font-bold">{r.agent}</span>
                    <span className="text-xs text-muted-foreground">{r.kind}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar-SA")}
                    </span>
                    <span className="text-xs">
                      F:{r.findings_count ?? 0} / R:{r.recommendations_count ?? 0} / {r.execution_time_ms ?? 0}ms
                    </span>
                    <span className="flex-1" />
                    <span className="text-sm">{r.summary}</span>
                  </button>
                  {isOpen && (
                    <pre className="mt-3 bg-slate-50 p-3 rounded text-xs overflow-auto max-h-80">
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  )}
                </Card>
              );
            })}
            {runsQ.data?.runs.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد عمليات تشغيل في الفترة المختارة.</p>
            )}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="font-semibold mb-2">
          التوصيات والأسباب ({recsQ.data?.recommendations.length ?? 0})
        </h2>
        {recsQ.isLoading ? (
          <p>جارٍ التحميل…</p>
        ) : (
          <div className="grid gap-2">
            {recsQ.data?.recommendations.map((rec: any) => (
              <Card key={rec.id} className="p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge>{rec.agent_name}</Badge>
                  <Badge variant="outline">{rec.category}</Badge>
                  <span className="font-medium">{rec.title}</span>
                  <span className="text-xs text-muted-foreground mr-auto">
                    ثقة {rec.confidence ?? "—"}% · أثر {rec.impact_estimate ?? 0}
                  </span>
                  <Badge variant="secondary">{rec.status}</Badge>
                </div>
                {rec.rationale && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    <strong>السبب:</strong> {rec.rationale}
                  </p>
                )}
              </Card>
            ))}
            {recsQ.data?.recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توصيات في الفترة المختارة.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
