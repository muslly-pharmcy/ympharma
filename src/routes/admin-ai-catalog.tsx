import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-catalog")({
  head: () => ({
    meta: [
      { title: "مركز قيادة AI الكتالوج السريري — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<AdminGate><CatalogAgentRunner /></AdminGate>),
});

type Bundle = {
  bundle_name: "باقة السكري" | "باقة الضغط" | "باقة الفيتامينات" | "باقة الأطفال" | string;
  product_keywords: string[];
  clinical_reasoning: string;
};

const DEFAULT_BRIEF = `اسحب وحلّل أسماء المنتجات الـ 267 الحية وامسحها مقابل الباقات الأربع المعتمدة:
- باقة السكري
- باقة الضغط
- باقة الفيتامينات
- باقة الأطفال
أعد مصفوفة JSON صارمة فقط، بحيث تُغذّى مباشرة إلى bundle_items.`;

const BUNDLE_STYLES: Record<string, string> = {
  "باقة السكري": "bg-rose-100 text-rose-800",
  "باقة الضغط": "bg-amber-100 text-amber-900",
  "باقة الفيتامينات": "bg-emerald-100 text-emerald-800",
  "باقة الأطفال": "bg-sky-100 text-sky-800",
};

function CatalogAgentRunner() {
  const ask = useServerFn(askAssistant);
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (loading || !brief.trim()) return;
    setLoading(true);
    setErr(null);
    setBundles([]);
    setRaw("");
    try {
      const res = await ask({
        data: { mode: "catalog", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setBundles(parsed as Bundle[]);
      toast.success(`تم توليد ${parsed.length} تعيين باقة سريريًا ✨`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر تحليل ناتج الوكيل";
      setErr(msg);
      toast.error("خطأ في التشغيل", { description: msg });
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

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Package className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">AI Clinical Catalog Specialist 📦</h1>
              <p className="text-xs text-white/85">ربط وتوزيع المنتجات الـ 267 الحالية على الباقات العلاجية المعتمدة تلقائيًا</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <label className="block text-xs font-bold text-muted-foreground mb-2">سياق التشغيل (للوكيل)</label>
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
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {loading ? "جاري تصنيف وتعبئة الباقات..." : "إعادة توليد وتعبئة الباقات الآن"}
          </button>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل تحليل JSON</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card" dir="rtl">
          <h2 className="mb-3 text-sm font-black">الحالة التشغيلية للباقات (Clinical Bundle Preview)</h2>
          {bundles.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              اضغط على الزر أعلاه لتشغيل الوكيل وربط الكلمات المفتاحية للمنتجات بالباقات (السكري، الضغط، الفيتامينات، الأطفال).
            </p>
          ) : (
            <div className="space-y-3">
              {bundles.map((b, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${BUNDLE_STYLES[b.bundle_name] ?? "bg-secondary text-foreground"}`}>
                      {b.bundle_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      الكلمات الدليليّة: {Array.isArray(b.product_keywords) ? b.product_keywords.join("، ") : "—"}
                    </span>
                  </div>
                  <p className="mb-1 text-sm font-bold">المنطق الطبي والتسويقي للباقة:</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{b.clinical_reasoning}</p>
                </div>
              ))}
              <details className="rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <summary className="cursor-pointer font-bold">عرض JSON الخام</summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap">{raw}</pre>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
