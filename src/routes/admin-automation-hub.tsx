import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle2, SkipForward, RotateCw, ArrowLeft, Filter } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { listAgentActions, decideAgentAction, agentActionsStats } from "@/lib/automation-hub.functions";

export const Route = createFileRoute("/admin-automation-hub")({
  head: () => ({
    meta: [
      { title: "مركز التشغيل المؤتمت — الإدارة" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AutomationHubPage,
});

type Row = {
  id: string;
  agent_name: string;
  originating_agent: string | null;
  action_type: string;
  target_pipeline: string | null;
  execution_status: string | null;
  status: string;
  priority_level: string | null;
  compiled_arabic_output: string | null;
  error_message: string | null;
  created_at: string;
  executed_at: string | null;
  updated_by_admin: string | null;
};

const STATUS_TABS: { v: "PENDING_APPROVAL" | "EXECUTED" | "SKIPPED" | "FAILED" | "ALL"; label: string; tone: string }[] = [
  { v: "PENDING_APPROVAL", label: "بانتظار الموافقة", tone: "bg-amber-100 text-amber-900" },
  { v: "EXECUTED", label: "منفّذ", tone: "bg-emerald-100 text-emerald-800" },
  { v: "FAILED", label: "فاشل", tone: "bg-rose-100 text-rose-800" },
  { v: "SKIPPED", label: "متخطّى", tone: "bg-slate-100 text-slate-700" },
  { v: "ALL", label: "الكل", tone: "bg-slate-200 text-slate-800" },
];

const PIPELINES: { v: "ALL" | "PRESCRIPTIONS" | "ORDERS" | "MARKETING_QUEUE" | "INVENTORY"; label: string }[] = [
  { v: "ALL", label: "كل المسارات" },
  { v: "PRESCRIPTIONS", label: "روشتات" },
  { v: "ORDERS", label: "طلبات" },
  { v: "INVENTORY", label: "مخزون" },
  { v: "MARKETING_QUEUE", label: "تسويق" },
];

const PRIO_TONES: Record<string, string> = {
  CRITICAL: "bg-rose-600 text-white",
  HIGH: "bg-amber-500 text-white",
  MEDIUM: "bg-sky-500 text-white",
  LOW: "bg-slate-400 text-white",
};

function AutomationHubPage() {
  const list = useServerFn(listAgentActions);
  const decide = useServerFn(decideAgentAction);
  const stats = useServerFn(agentActionsStats);
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]["v"]>("PENDING_APPROVAL");
  const [pipelineFilter, setPipelineFilter] = useState<(typeof PIPELINES)[number]["v"]>("ALL");

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        list({ data: { execution_status: statusFilter, target_pipeline: pipelineFilter, limit: 100 } }),
        stats(),
      ]);
      setRows((r.rows as Row[]) ?? []);
      setCounts((s.counts as Record<string, number>) ?? {});
    } catch (e: any) {
      toast.error(e?.message || "تعذر تحميل البيانات");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter, pipelineFilter]);

  async function act(id: string, decision: "EXECUTE" | "SKIP" | "RETRY") {
    setBusyId(id);
    try {
      await decide({ data: { id, decision } });
      const labels = { EXECUTE: "تم التنفيذ", SKIP: "تم التخطي", RETRY: "أعيد إلى قائمة الانتظار" };
      toast.success(labels[decision]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "فشل الإجراء");
    } finally { setBusyId(null); }
  }

  const totalShown = rows.length;
  const summaryChips = useMemo(() => [
    { label: "بانتظار", v: counts.PENDING_APPROVAL ?? 0, tone: "bg-amber-100 text-amber-900" },
    { label: "منفّذ", v: counts.EXECUTED ?? 0, tone: "bg-emerald-100 text-emerald-800" },
    { label: "فاشل", v: counts.FAILED ?? 0, tone: "bg-rose-100 text-rose-800" },
    { label: "متخطّى", v: counts.SKIPPED ?? 0, tone: "bg-slate-100 text-slate-700" },
  ], [counts]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">مركز التشغيل المؤتمت (Automation Hub)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              السجل المركزي لكل قرارات الوكلاء — موافقة/تخطي/إعادة. آخر 7 أيام.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="rounded-xl bg-secondary px-3 py-2 text-xs font-black hover:bg-accent">
              <ArrowLeft className="inline size-3.5 ml-1" /> لوحة الإدمن
            </Link>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              تحديث
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summaryChips.map((c) => (
            <div key={c.label} className={`rounded-2xl border border-border bg-card p-4 shadow-card`}>
              <div className="text-xs font-bold text-muted-foreground">{c.label} (7 أيام)</div>
              <div className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-2xl font-black ${c.tone}`}>{c.v}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Filter className="size-3.5" />الحالة:</span>
          {STATUS_TABS.map((t) => (
            <button key={t.v} onClick={() => setStatusFilter(t.v)}
              className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${statusFilter === t.v ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">المسار:</span>
          {PIPELINES.map((p) => (
            <button key={p.v} onClick={() => setPipelineFilter(p.v)}
              className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${pipelineFilter === p.v ? "bg-indigo-600 text-white" : "bg-secondary hover:bg-accent"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="overflow-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary text-[11px] font-black">
              <tr>
                <th className="px-3 py-2">الوقت</th>
                <th className="px-3 py-2">الوكيل</th>
                <th className="px-3 py-2">المسار</th>
                <th className="px-3 py-2">الأولوية</th>
                <th className="px-3 py-2">النوع</th>
                <th className="px-3 py-2">المحتوى</th>
                <th className="px-3 py-2">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin" /> جارٍ التحميل…
                </td></tr>
              )}
              {!loading && totalShown === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد قرارات مطابقة لهذا الفلتر.</td></tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top hover:bg-accent/30">
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                  <td className="px-3 py-2 font-bold">{r.originating_agent ?? r.agent_name}</td>
                  <td className="px-3 py-2"><span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800">{r.target_pipeline ?? "—"}</span></td>
                  <td className="px-3 py-2">
                    {r.priority_level && (
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black ${PRIO_TONES[r.priority_level] ?? "bg-slate-200 text-slate-700"}`}>{r.priority_level}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]" dir="ltr">{r.action_type}</td>
                  <td className="px-3 py-2 max-w-md">
                    <div className="line-clamp-3">{r.compiled_arabic_output ?? "—"}</div>
                    {r.error_message && (
                      <div className="mt-1 text-[10px] text-rose-700" dir="ltr">⚠ {r.error_message}</div>
                    )}
                    {r.updated_by_admin && (
                      <div className="mt-1 text-[10px] text-muted-foreground">آخر تحديث: {r.updated_by_admin}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.execution_status === "PENDING_APPROVAL" && (
                      <div className="flex gap-1">
                        <button onClick={() => act(r.id, "EXECUTE")} disabled={busyId === r.id}
                          title="موافقة وتنفيذ"
                          className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                          {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        </button>
                        <button onClick={() => act(r.id, "SKIP")} disabled={busyId === r.id}
                          title="تخطي" className="grid size-7 place-items-center rounded-lg bg-slate-400 text-white hover:bg-slate-500 disabled:opacity-50">
                          <SkipForward className="size-3.5" />
                        </button>
                      </div>
                    )}
                    {r.execution_status === "FAILED" && (
                      <button onClick={() => act(r.id, "RETRY")} disabled={busyId === r.id}
                        title="إعادة محاولة" className="flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-black text-white hover:bg-amber-600 disabled:opacity-50">
                        <RotateCw className="size-3" /> إعادة
                      </button>
                    )}
                    {(r.execution_status === "EXECUTED" || r.execution_status === "SKIPPED") && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          يعرض آخر 100 سجل لكل فلتر. الإحصائيات الملخّصة تغطي آخر 7 أيام.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
