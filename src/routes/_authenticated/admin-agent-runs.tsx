import { createFileRoute, ErrorComponent, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getAgentRuns,
  getAgentRunsCsv,
  getAgentRecommendations,
  getActiveAgentAlerts,
  getAgentList,
} from "@/lib/agent-runs.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin-agent-runs")({
  component: AdminAgentRuns,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <ErrorComponent error={error} />
        <Button onClick={() => { router.invalidate(); reset(); }}>إعادة المحاولة</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

function statusTone(s: string) {
  if (s === "ok") return "bg-emerald-100 text-emerald-700";
  if (s === "warn") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}
function sevTone(s: string) {
  if (s === "critical") return "bg-rose-600 text-white";
  if (s === "high") return "bg-orange-500 text-white";
  if (s === "medium") return "bg-amber-400 text-black";
  return "bg-slate-300 text-black";
}

function AdminAgentRuns() {
  const [hours, setHours] = useState<number>(24);
  const [agent, setAgent] = useState<string>("");
  const [status, setStatus] = useState<"" | "ok" | "warn" | "error">("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRuns = useServerFn(getAgentRuns);
  const fetchCsv = useServerFn(getAgentRunsCsv);
  const fetchRecs = useServerFn(getAgentRecommendations);
  const fetchAlerts = useServerFn(getActiveAgentAlerts);
  const fetchAgents = useServerFn(getAgentList);

  const filter = { hours, ...(agent ? { agent } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}) };

  const runsQ = useQuery({ queryKey: ["agent-runs", filter], queryFn: () => fetchRuns({ data: filter }) });
  const recsQ = useQuery({ queryKey: ["agent-recs", hours], queryFn: () => fetchRecs({ data: { hours } }) });
  const alertsQ = useQuery({ queryKey: ["agent-alerts-active"], queryFn: () => fetchAlerts(), refetchInterval: 60_000 });
  const agentsQ = useQuery({ queryKey: ["agent-list"], queryFn: () => fetchAgents() });

  const exportCsv = async () => {
    const res = await fetchCsv({ data: filter });
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-runs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">سجلات تشغيل الوكلاء</h1>
          <p className="text-sm text-muted-foreground">آخر {hours} ساعة — مع فلترة وبحث وتصدير.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin-alert-settings"><Button variant="outline">⚙️ ضبط التنبيهات</Button></Link>
          <Button onClick={exportCsv}>⬇ تصدير CSV</Button>
        </div>
      </header>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs block mb-1">الفترة (ساعات)</label>
          <div className="flex gap-1">
            {[6, 12, 24, 72, 168].map((h) => (
              <Button key={h} size="sm" variant={hours === h ? "default" : "outline"} onClick={() => setHours(h)}>{h}س</Button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1">الوكيل</label>
          <select className="border rounded h-9 px-2 min-w-[140px]" value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="">الكل</option>
            {(agentsQ.data?.agents ?? []).map((a: string) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">الحالة</label>
          <select className="border rounded h-9 px-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="">الكل</option>
            <option value="ok">ok</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs block mb-1">بحث (summary / kind)</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نص للبحث…" />
        </div>
        <Button variant="ghost" onClick={() => { setAgent(""); setStatus(""); setQ(""); }}>إعادة</Button>
      </Card>

      {/* Active alerts */}
      <section>
        <h2 className="font-semibold mb-2">التنبيهات النشطة</h2>
        {alertsQ.isLoading ? <p className="text-sm">جارٍ التحميل…</p> : alertsQ.data?.alerts?.length ? (
          <div className="grid gap-2">
            {alertsQ.data.alerts.map((a: any) => (
              <Card key={a.alert_key} className="p-3 flex items-center justify-between">
                <div>
                  <Badge className={sevTone(a.severity)}>{a.severity}</Badge>
                  <span className="mx-2 font-medium">{a.agent}</span>
                  <span>{a.message}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : <p className="text-sm text-emerald-700">✅ لا توجد تنبيهات نشطة</p>}
      </section>

      {/* Runs */}
      <section>
        <h2 className="font-semibold mb-2">عمليات التشغيل ({runsQ.data?.runs.length ?? 0})</h2>
        {runsQ.isLoading ? <p>جارٍ التحميل…</p> : (
          <div className="space-y-2">
            {runsQ.data?.runs.map((r: any) => {
              const isOpen = expanded === r.id;
              return (
                <Card key={r.id} className="p-3">
                  <button className="w-full text-right flex flex-wrap items-center gap-2" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <Badge className={statusTone(r.status)}>{r.status}</Badge>
                    <span className="font-bold">{r.agent}</span>
                    <span className="text-xs text-muted-foreground">{r.kind}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-SA")}</span>
                    <span className="text-xs">F:{r.findings_count ?? 0} / R:{r.recommendations_count ?? 0} / {r.execution_time_ms ?? 0}ms</span>
                    <span className="flex-1" />
                    <span className="text-sm">{r.summary}</span>
                  </button>
                  {isOpen && (
                    <pre className="mt-3 bg-slate-50 p-3 rounded text-xs overflow-auto max-h-80">{JSON.stringify(r.details, null, 2)}</pre>
                  )}
                </Card>
              );
            })}
            {runsQ.data?.runs.length === 0 && <p className="text-sm text-muted-foreground">لا عمليات في الفلتر الحالي.</p>}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="font-semibold mb-2">التوصيات والأسباب ({recsQ.data?.recommendations.length ?? 0})</h2>
        {recsQ.isLoading ? <p>جارٍ التحميل…</p> : (
          <div className="grid gap-2">
            {recsQ.data?.recommendations.map((rec: any) => (
              <Card key={rec.id} className="p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge>{rec.agent_name}</Badge>
                  <Badge variant="outline">{rec.category}</Badge>
                  <span className="font-medium">{rec.title}</span>
                  <span className="text-xs text-muted-foreground mr-auto">ثقة {rec.confidence ?? "—"}% · أثر {rec.impact_estimate ?? 0}</span>
                  <Badge variant="secondary">{rec.status}</Badge>
                </div>
                {rec.rationale && <p className="text-sm text-muted-foreground mt-2 leading-relaxed"><strong>السبب:</strong> {rec.rationale}</p>}
              </Card>
            ))}
            {recsQ.data?.recommendations.length === 0 && <p className="text-sm text-muted-foreground">لا توصيات.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
