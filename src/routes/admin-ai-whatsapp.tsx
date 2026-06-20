import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageCircle, AlertTriangle, Send } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-whatsapp")({
  head: () => ({
    meta: [
      { title: "مركز قيادة AI WhatsApp — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WhatsAppAgentRunner,
});

type Rec = {
  recipient_profile_id: string;
  phone_number_id: string;
  trigger_type: "ORDER_CONFIRMED" | "STATUS_CHANGED" | "CHRONIC_REFILL_REMINDER" | "CART_RECOVERY" | string;
  message_content_arabic: string;
  action_url: string | null;
};

const DEFAULT_BRIEF = `حلّل قائمة الإرسال الصادرة الآن:
- 11 طلبًا نشطًا، 3 عمليات تتبّع
- صُغ رسائل ORDER_CONFIRMED / STATUS_CHANGED / CHRONIC_REFILL_REMINDER / CART_RECOVERY
- شخصنة باسم العميل والسياق، تجنّب التكرار التسويقي
أعد مصفوفة JSON صارمة فقط.`;

const TRIGGER_STYLES: Record<string, string> = {
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-800",
  STATUS_CHANGED: "bg-sky-100 text-sky-800",
  CHRONIC_REFILL_REMINDER: "bg-amber-100 text-amber-900",
  CART_RECOVERY: "bg-rose-100 text-rose-800",
};

function WhatsAppAgentRunner() {
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
        data: { mode: "whatsapp", messages: [{ role: "user", content: brief.trim() }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRecs(parsed as Rec[]);
      toast.success(`تم توليد ${parsed.length} رسالة جاهزة`);
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

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><MessageCircle className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">AI WhatsApp Command Center 💬</h1>
              <p className="text-xs text-white/85">إدارة وتوليد رسائل التتبّع وتذكيرات الأدوية المزمنة تلقائيًا</p>
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
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {loading ? "جاري معالجة البيانات..." : "تشغيل الوكيل الآن"}
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
          <h2 className="mb-3 text-sm font-black">قائمة الرسائل الجاهزة للإرسال (Outbound Queue)</h2>
          {recs.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد رسائل معلّقة حاليًا. اضغط على "تشغيل" لفحص الـ 11 طلبًا النشطة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="text-[11px] uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pe-2 font-black">النوع</th>
                    <th className="py-2 pe-2 font-black">المستلم</th>
                    <th className="py-2 pe-2 font-black">نص الرسالة المقترح</th>
                    <th className="py-2 pe-2 font-black">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r, i) => (
                    <tr key={i} className="border-b border-border/60 align-top">
                      <td className="py-2 pe-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${TRIGGER_STYLES[r.trigger_type] ?? "bg-secondary text-foreground"}`}>
                          {r.trigger_type}
                        </span>
                      </td>
                      <td className="py-2 pe-2 text-xs text-muted-foreground">{r.recipient_profile_id || "—"}</td>
                      <td className="py-2 pe-2 text-xs leading-relaxed whitespace-pre-wrap">{r.message_content_arabic}</td>
                      <td className="py-2 pe-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">جاهز للبث</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
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
