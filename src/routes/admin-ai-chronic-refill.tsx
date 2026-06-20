import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, HeartPulse, AlertTriangle, Send } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-chronic-refill")({
  head: () => ({
    meta: [
      { title: "وكيل إعادة التعبئة المزمنة — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChronicRefillAgentRunner,
});

type Rec = {
  agent_name: string;
  customer_id: string;
  customer_name: string;
  medication_detected: string;
  days_until_exhaustion: number;
  urgency_level: "CRITICAL" | "HIGH" | "MEDIUM" | string;
  recommended_whatsapp_copy: string;
};

const DEFAULT_BRIEF = `حلّل ملفات العملاء النشطين وتاريخ الـ 11 طلب نشط.
- اكتشف الأدوية المزمنة المشتراة (سكري، ضغط، ربو، غدة، قلب).
- احسب days_until_exhaustion بناءً على الكمية المشتراة وتاريخ الطلب.
- صنّف الإلحاح: CRITICAL (≤ 3 أيام) / HIGH (4-7) / MEDIUM (8-14).
- اكتب نص واتساب متعاطف بالعربية الفصحى لكل مريض يذكّره بإعادة تعبئة دوائه المحدد.
أعد مصفوفة JSON صارمة فقط، بدون أي تغليف.`;

const URGENCY_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-800",
  HIGH: "bg-amber-100 text-amber-900",
  MEDIUM: "bg-sky-100 text-sky-800",
};

function ChronicRefillAgentRunner() {
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
        data: { mode: "chronic_refill", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRecs(parsed as Rec[]);
      toast.success(`تم تحديد ${parsed.length} مريض بحاجة لإعادة تعبئة`);
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
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> رجوع للوحة الإدارة
        </Link>

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><HeartPulse className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">وكيل إعادة التعبئة المزمنة 💊</h1>
              <p className="text-xs text-white/85">رصد المرضى المزمنين قبل نفاد جرعاتهم وتوليد تذكيرات واتساب آلية</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <label className="block text-xs font-bold text-muted-foreground mb-2">سياق التشغيل السريري</label>
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
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {loading ? "جاري تحليل ملفات المرضى..." : "تشغيل الوكيل الآن"}
          </button>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل تحليل JSON</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-black">قائمة تذكيرات إعادة التعبئة (Refill Queue)</h2>
          {recs.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد تذكيرات حاليًا. اضغط "تشغيل" لفحص المرضى المزمنين.</p>
          ) : (
            <div className="space-y-3">
              {recs.map((r, i) => (
                <div key={i} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${URGENCY_STYLES[r.urgency_level] ?? "bg-secondary text-foreground"}`}>
                      {r.urgency_level}
                    </span>
                    <span className="text-sm font-black">{r.customer_name || "—"}</span>
                    <span className="text-[11px] text-muted-foreground">#{r.customer_id}</span>
                    <span className="ms-auto text-[11px] font-bold text-muted-foreground">
                      {r.days_until_exhaustion} يوم متبقّ
                    </span>
                  </div>
                  <p className="text-xs text-foreground mb-1">
                    <span className="font-bold">الدواء المرصود:</span> {r.medication_detected}
                  </p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {r.recommended_whatsapp_copy}
                  </p>
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
