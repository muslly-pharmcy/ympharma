import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Boxes, AlertTriangle } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-inventory")({
  head: () => ({
    meta: [
      { title: "وكيل المخزون والعمليات — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InventoryAgentRunner,
});

type Rec = {
  agent_name: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  issue_detected: string;
  affected_items_count: number;
  recommended_action: string;
  target_table_context: string;
};

const DEFAULT_BRIEF = `حلّل حالة المخزون والعمليات الآن:
- 267 منتجًا حيًّا
- توجد باقات parent بدون عناصر child (Critical UI Dead-ends) في bundle_items
- راقب المنتجات منخفضة المخزون وسرعة الطلب وأي شذوذ في المعاملات
أعد توصيات JSON صارمة وفق الشكل المحدد (agent_name="inventory_operations").`;

const PRIORITY_BADGE: Record<Rec["priority"], string> = {
  HIGH: "bg-rose-100 text-rose-800",
  MEDIUM: "bg-amber-100 text-amber-900",
  LOW: "bg-emerald-100 text-emerald-800",
};

function InventoryAgentRunner() {
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
        data: { mode: "inventory", messages: [{ role: "user", content: brief.trim() }] },
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

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Boxes className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">وكيل المخزون والعمليات التنفيذي</h1>
              <p className="text-xs text-white/85">يكتشف نقاط الخلل في المخزون والباقات وينتج توصيات JSON قابلة للتنفيذ</p>
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
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Boxes className="size-4" />}
            {loading ? "جاري التحليل..." : "تشغيل وكيل المخزون"}
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
            <h2 className="text-sm font-black text-muted-foreground">التوصيات ({recs.length})</h2>
            {recs.map((r, i) => (
              <article key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded-full px-2 py-0.5 font-black ${PRIORITY_BADGE[r.priority] ?? "bg-slate-100 text-slate-800"}`}>{r.priority}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-800">{r.target_table_context}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">عناصر متأثرة: {r.affected_items_count}</span>
                </div>
                <p className="text-sm font-black">{r.issue_detected}</p>
                <p className="mt-1 text-sm text-muted-foreground"><b>الإجراء الموصى به:</b> {r.recommended_action}</p>
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
