import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, LayoutDashboard, AlertTriangle, Activity, Package, Bot, UserX } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-executive-dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم التنفيذية الذكية — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExecutiveDashboardRunner,
});

type KPI = {
  active_fulfillment_orders: number;
  unresolved_agent_recommendations_count: number;
  detected_churn_risk_profiles: number;
};

type Snapshot = {
  dashboard_snapshot_agent: string;
  global_readiness_score: number;
  operational_health_status: "EXCELLENT" | "STABLE" | "DEGRADED";
  key_performance_indicators: KPI;
  strategic_macro_insight_arabic: string;
};

const DEFAULT_BRIEF = `الحالة الكلية للمنصة:
- 11 طلب نشط، 3 lookups تتبع
- 267 منتجًا حيًّا، 4 حملات، 4 أكواد خصم
- agent_recommendations: راجع توصيات وكلاء التسويق/CX/المخزون/المشتريات
- أمان: 0 ثغرات مفتوحة، RLS مفعّل 100%
- ولاء: Silver/Gold/Platinum — قارن استخدام الخصومات بالمستويات
- مخاطر churn: من جدول إعادة التعبئة المزمنة
أنتج JSON صارم بصيغة executive_command_center.`;

const STATUS_STYLES: Record<Snapshot["operational_health_status"], string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-800 border-emerald-300",
  STABLE: "bg-sky-100 text-sky-800 border-sky-300",
  DEGRADED: "bg-rose-100 text-rose-800 border-rose-300",
};

function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-700";
  if (n >= 60) return "text-amber-700";
  return "text-rose-700";
}

function ExecutiveDashboardRunner() {
  const ask = useServerFn(askAssistant);
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (loading || !brief.trim()) return;
    setLoading(true);
    setErr(null);
    setSnaps([]);
    setRaw("");
    try {
      const res = await ask({
        data: { mode: "executive_dashboard", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setSnaps(parsed as Snapshot[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تحليل ناتج الوكيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> رجوع للوحة الإدارة
        </Link>

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-900 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/15"><LayoutDashboard className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">مركز قيادة التنفيذيين — Executive Command Center</h1>
              <p className="text-xs text-white/85">تجميع ذكي لمؤشرات الأداء والمخاطر للـ CEO و CTO</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <label className="block text-xs font-bold text-muted-foreground mb-2">سياق التحليل</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={7}
            className="w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !brief.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LayoutDashboard className="size-4" />}
            {loading ? "جاري التجميع..." : "توليد لوحة التحكم"}
          </button>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل تحليل JSON</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        {snaps.length > 0 && (
          <section className="mt-5 space-y-4">
            {snaps.map((s, i) => {
              const kpi = s.key_performance_indicators ?? ({} as KPI);
              return (
                <article key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <Bot className="size-4" /> {s.dashboard_snapshot_agent}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${STATUS_STYLES[s.operational_health_status] ?? "bg-secondary text-foreground border-border"}`}>
                      {s.operational_health_status}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-secondary/40 p-3 text-center">
                      <div className="text-[11px] font-bold text-muted-foreground">جاهزية عالمية</div>
                      <div className={`text-3xl font-black ${scoreColor(Number(s.global_readiness_score) || 0)}`}>{s.global_readiness_score}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3 text-center">
                      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground"><Package className="size-3" /> طلبات نشطة</div>
                      <div className="text-2xl font-black text-foreground">{kpi.active_fulfillment_orders}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3 text-center">
                      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground"><Activity className="size-3" /> توصيات معلّقة</div>
                      <div className="text-2xl font-black text-amber-700">{kpi.unresolved_agent_recommendations_count}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3 text-center">
                      <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground"><UserX className="size-3" /> مخاطر تسرّب</div>
                      <div className="text-2xl font-black text-rose-700">{kpi.detected_churn_risk_profiles}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="mb-1 text-[11px] font-black text-muted-foreground">رؤية ماكرو استراتيجية</div>
                    <p className="text-sm leading-relaxed">{s.strategic_macro_insight_arabic}</p>
                  </div>
                </article>
              );
            })}
            <details className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
              <summary className="cursor-pointer font-bold">عرض JSON الخام</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap">{raw}</pre>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
