import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-marketing")({
  head: () => ({
    meta: [
      { title: "وكيل التسويق الذكي — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<AdminGate><MarketingAgentRunner /></AdminGate>),
});

type Recommendation = {
  campaign_id: string | null;
  target_segment: string;
  trigger_condition: string;
  recommended_action: string;
  discount_code_optimized: string | null;
  banner_content_update: { headline: string; subheading: string; cta_text: string };
  reasoning_kpi: string;
};

const DEFAULT_BRIEF = `حلل أداء المنصة الحالي:
- 267 منتجًا حيًّا
- 4 حملات تسويقية نشطة
- 4 أكواد خصم بـ 0 استخدامات
الهدف: تحقيق أول استخدام لأكواد الخصم وتعزيز تحويل الباقات.
أعد توصيات JSON صارمة وفق الشكل المحدد.`;

function MarketingAgentRunner() {
  const ask = useServerFn(askAssistant);
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<string>("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  async function run() {
    if (loading || !brief.trim()) return;
    setLoading(true);
    setParseError(null);
    setRecs([]);
    setRaw("");
    try {
      const res = await ask({
        data: { mode: "marketing", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRecs(parsed as Recommendation[]);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "تعذّر تحليل ناتج الوكيل");
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

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Sparkles className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">وكيل التسويق والنمو الذاتي</h1>
              <p className="text-xs text-white/85">يحلل الحملات وأكواد الخصم وينتج توصيات JSON مهيكلة</p>
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
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "جاري التحليل..." : "تشغيل وكيل التسويق"}
          </button>
        </section>

        {parseError && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل تحليل JSON</div>
            <p className="mt-1 text-xs">{parseError}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        {recs.length > 0 && (
          <section className="mt-5 space-y-3">
            <h2 className="text-sm font-black text-muted-foreground">التوصيات ({recs.length})</h2>
            {recs.map((r, i) => (
              <article key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">{r.target_segment}</span>
                  {r.discount_code_optimized && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">كود: {r.discount_code_optimized}</span>
                  )}
                  {r.campaign_id && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-800">حملة: {r.campaign_id}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground"><b>الشرط المُفعِّل:</b> {r.trigger_condition}</p>
                <p className="mt-1 text-sm"><b>الإجراء الموصى به:</b> {r.recommended_action}</p>
                <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                  <p className="text-base font-black">{r.banner_content_update.headline}</p>
                  <p className="text-sm text-muted-foreground">{r.banner_content_update.subheading}</p>
                  <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{r.banner_content_update.cta_text}</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground"><b>KPI:</b> {r.reasoning_kpi}</p>
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
