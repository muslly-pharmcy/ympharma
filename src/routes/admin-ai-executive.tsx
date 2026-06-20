import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Crown, AlertTriangle } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-executive")({
  head: () => ({
    meta: [
      { title: "المجلس التنفيذي الذكي — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<AdminGate><ExecutiveAgentRunner /></AdminGate>),
});

type Rec = {
  agent_name: string;
  system_readiness_score: number;
  business_viability_score: number;
  critical_macro_decision: string;
  infrastructure_directive: string;
};

const DEFAULT_BRIEF = `راجع الحالة الكلية للمنصة:
- 267 منتجًا حيًّا
- 0 ثغرات أمنية مفتوحة
- مخرجات الوكلاء الفرعيين (تسويق، مخزون، CX) متاحة
- مؤشرات: image proxy, error_logs, uptime_checks, uptime_incidents
أصدر قرارات استراتيجية ماكرو بصيغة JSON صارمة (agent_name="executive_board").`;

function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-700";
  if (n >= 60) return "text-amber-700";
  return "text-rose-700";
}

function ExecutiveAgentRunner() {
  const ask = useServerFn(askAssistant);
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [recs, setRecs] = useState<Rec[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (loading || !brief.trim()) return;
    setLoading(true);
    setErr(null);
    setRecs([]);
    setRaw("");
    try {
      const res = await ask({
        data: { mode: "executive", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRecs(parsed as Rec[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تحليل ناتج الوكيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> رجوع للوحة الإدارة
        </Link>

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Crown className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">المجلس التنفيذي الذكي (CEO + CTO)</h1>
              <p className="text-xs text-white/85">قرارات ماكرو-استراتيجية لصحة النظام وسرعة الأعمال</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <label className="block text-xs font-bold text-muted-foreground mb-2">سياق التحليل (للوكيل)</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !brief.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
            {loading ? "جاري التحليل..." : "تشغيل المجلس التنفيذي"}
          </button>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل تحليل JSON</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        {recs.length > 0 && (
          <section className="mt-5 space-y-3">
            <h2 className="text-sm font-black text-muted-foreground">القرارات ({recs.length})</h2>
            {recs.map((r, i) => (
              <article key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-secondary/40 p-3 text-center">
                    <div className="text-[11px] font-bold text-muted-foreground">جاهزية النظام</div>
                    <div className={`text-2xl font-black ${scoreColor(Number(r.system_readiness_score) || 0)}`}>{r.system_readiness_score}</div>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3 text-center">
                    <div className="text-[11px] font-bold text-muted-foreground">جدوى الأعمال</div>
                    <div className={`text-2xl font-black ${scoreColor(Number(r.business_viability_score) || 0)}`}>{r.business_viability_score}</div>
                  </div>
                </div>
                <p className="text-sm"><b>قرار ماكرو حرج:</b> {r.critical_macro_decision}</p>
                <p className="mt-1 text-sm text-muted-foreground"><b>توجيه البنية التحتية:</b> {r.infrastructure_directive}</p>
              </article>
            ))}
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
