import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ArrowLeft, Play, PlayCircle, Activity, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAgentWorkforce, runOneAgentNow, runAllAgentsNow, listAgentRecommendations,
  type WorkforceSummary, type AgentRecommendation,
} from "@/lib/agent-workforce.functions";

const AGENT_LABELS: Record<string, { ar: string; role: string; emoji: string }> = {
  ceo:        { ar: "المدير التنفيذي",    role: "إيراد وهامش", emoji: "👔" },
  cto:        { ar: "المدير التقني",      role: "أخطاء وتوفّر", emoji: "⚙️" },
  sales:      { ar: "مدير المبيعات",       role: "بيع مشترك",   emoji: "💰" },
  inventory:  { ar: "مدير المخزون",        role: "إعادة طلب",   emoji: "📦" },
  operations: { ar: "مدير العمليات",       role: "SLA وطلبات",  emoji: "🚚" },
  marketing:  { ar: "مدير التسويق",        role: "حملات وشرائح", emoji: "📣" },
  cx:         { ar: "تجربة العملاء",       role: "احتفاظ وchurn", emoji: "💬" },
  bi:         { ar: "ذكاء الأعمال",        role: "اتجاهات وتنبؤ", emoji: "📊" },
};

export const Route = createFileRoute("/admin-workforce")({
  head: () => ({
    meta: [
      { title: "غرفة الوكلاء الذكيين — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WorkforcePage,
});

function statusBadge(status?: string) {
  if (status === "ok") return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600"><CheckCircle2 className="size-3" />ناجح</span>;
  if (status === "running") return <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600"><Activity className="size-3 animate-pulse" />يعمل</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-600"><XCircle className="size-3" />خطأ</span>;
  return <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"><AlertCircle className="size-3" />لم يعمل</span>;
}

function ScoreBar({ score }: { score: number | null | undefined }) {
  const s = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full ${color}`} style={{ width: `${s}%` }} />
      </div>
      <span className="w-9 text-end font-mono text-[11px] tabular-nums text-muted-foreground">{score == null ? "—" : Math.round(s)}</span>
    </div>
  );
}

function WorkforcePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<WorkforceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningOne, setRunningOne] = useState<string | null>(null);
  const [recsOpen, setRecsOpen] = useState<string | null>(null);
  const [recs, setRecs] = useState<AgentRecommendation[]>([]);

  const get = useServerFn(getAgentWorkforce);
  const runOne = useServerFn(runOneAgentNow);
  const runAll = useServerFn(runAllAgentsNow);
  const listRecs = useServerFn(listAgentRecommendations);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await get()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "تعذر التحميل"); }
    finally { setLoading(false); }
  }, [get]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await runAll();
      toast.success("تم تشغيل جميع الوكلاء");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل التشغيل"); }
    finally { setRunningAll(false); }
  };
  const handleRunOne = async (agent: string) => {
    setRunningOne(agent);
    try {
      await runOne({ data: { agent: agent as never } });
      toast.success(`تم تشغيل وكيل ${AGENT_LABELS[agent]?.ar ?? agent}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل التشغيل"); }
    finally { setRunningOne(null); }
  };
  const openRecs = async (agent: string) => {
    setRecsOpen(agent);
    try {
      const rows = await listRecs({ data: { agent: agent as never, limit: 50 } });
      setRecs(rows);
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر تحميل التوصيات"); }
  };

  if (authed === false) {
    return <div className="grid min-h-screen place-items-center"><Link to="/admin" className="text-primary underline">يلزم تسجيل الدخول</Link></div>;
  }
  if (authed === null || loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  const readiness = data?.readiness_score ?? null;
  const readinessColor = readiness == null ? "text-muted-foreground" : readiness >= 70 ? "text-emerald-600" : readiness >= 40 ? "text-amber-600" : "text-rose-600";

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">غرفة الوكلاء الذكيين</h1>
            <p className="text-xs text-muted-foreground">8 وكلاء يعملون باستقلالية — رصد، تحليل، توصية، تنفيذ، تدقيق</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRunAll} disabled={runningAll}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {runningAll ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              تشغيل كل الوكلاء الآن
            </button>
            <button onClick={load} className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent"><RefreshCw className="size-4" /></button>
            <Link to="/admin-command" className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent"><ArrowLeft className="size-4 rotate-180" /></Link>
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">جاهزية المنظومة</div>
              <div className={`text-3xl font-extrabold ${readinessColor}`}>{readiness == null ? "—" : `${Math.round(readiness)}/100`}</div>
            </div>
            <div className="text-end text-xs text-muted-foreground">
              <div>محدّث: {data?.as_of ? new Date(data.as_of).toLocaleString("ar") : "—"}</div>
              <div>متوسط درجات الـKPI خلال آخر 24 ساعة</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data?.agents.map((a) => {
            const meta = AGENT_LABELS[a.name] ?? { ar: a.name, role: "", emoji: "🤖" };
            const lr = a.last_run;
            return (
              <div key={a.name} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <h3 className="font-bold">{meta.ar}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{meta.role}</p>
                  </div>
                  {statusBadge(lr?.status)}
                </div>

                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between"><span>آخر تشغيل</span><span>{lr?.started_at ? new Date(lr.started_at).toLocaleString("ar") : "—"}</span></div>
                  <div className="flex justify-between"><span>الاكتشافات</span><span className="font-mono tabular-nums text-foreground">{lr?.findings_count ?? 0}</span></div>
                  <div className="flex justify-between"><span>التوصيات</span><span className="font-mono tabular-nums text-foreground">{lr?.recommendations_count ?? 0}</span></div>
                  <div className="flex justify-between"><span>زمن التنفيذ</span><span className="font-mono tabular-nums">{lr?.execution_time_ms != null ? `${lr.execution_time_ms} ms` : "—"}</span></div>
                  <div className="flex justify-between"><span>توصيات مفتوحة (7 أيام)</span><span className="font-mono tabular-nums text-foreground">{a.open_recommendations}</span></div>
                </div>

                {lr?.summary && <p className="rounded-lg bg-secondary/40 p-2 text-[11px]">{lr.summary}</p>}

                <div className="space-y-1.5 border-t border-border pt-2">
                  {(a.kpis ?? []).map((k) => (
                    <div key={k.metric} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{k.metric}</span>
                      </div>
                      <ScoreBar score={k.score} />
                    </div>
                  ))}
                  {(!a.kpis || a.kpis.length === 0) && <p className="text-[11px] text-muted-foreground">لا توجد درجات KPI بعد — شغّل الوكيل أولاً</p>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => handleRunOne(a.name)} disabled={runningOne === a.name}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
                    {runningOne === a.name ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                    تشغيل الآن
                  </button>
                  <button onClick={() => openRecs(a.name)}
                    className="flex-1 rounded-xl bg-secondary px-2 py-1.5 text-xs hover:bg-accent">
                    عرض التوصيات
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setRecsOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">توصيات وكيل {AGENT_LABELS[recsOpen]?.ar ?? recsOpen}</h2>
              <button onClick={() => setRecsOpen(null)} className="rounded-md bg-secondary px-2 py-1 text-xs">إغلاق</button>
            </div>
            <ul className="space-y-2">
              {recs.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد توصيات — شغّل الوكيل ثم أعد المحاولة</li>}
              {recs.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{r.title}</h4>
                      {r.rationale && <p className="mt-1 text-xs text-muted-foreground">{r.rationale}</p>}
                    </div>
                    <div className="text-end text-[10px] text-muted-foreground">
                      {r.confidence != null && <div>ثقة {r.confidence}%</div>}
                      {r.impact_estimate != null && <div>أثر {Math.round(r.impact_estimate)} ر.ي</div>}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(r.created_at).toLocaleString("ar")}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5">{r.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
