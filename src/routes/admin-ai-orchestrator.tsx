import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Cpu, ShieldCheck, Download } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-orchestrator")({
  head: () => ({
    meta: [
      { title: "مركز التنسيق الأعلى — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrchestratorRunner,
});

type Action = {
  action_id: string;
  originating_agent: string;
  target_table: string;
  execution_priority: "CRITICAL" | "HIGH" | "MEDIUM";
  payload_data: {
    customer_id: string | null;
    action_type: string;
    compiled_content_arabic: string;
  };
  human_approval_required: boolean;
};

const PRIO_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300",
  HIGH: "bg-amber-100 text-amber-900 border-amber-300",
  MEDIUM: "bg-sky-100 text-sky-800 border-sky-300",
};

const AGENT_STYLES: Record<string, string> = {
  pharmacist: "bg-teal-100 text-teal-800",
  inventory: "bg-indigo-100 text-indigo-800",
  procurement: "bg-violet-100 text-violet-800",
  refill: "bg-emerald-100 text-emerald-800",
  marketing: "bg-pink-100 text-pink-800",
  import_excel_classifier: "bg-cyan-100 text-cyan-800",
};

const SAMPLE = `سيناريو اليوم:
- وصفة جديدة: المريض #C-1042 رفع وصفة تحتوي metformin 500mg و amlodipine 5mg.
- المخزون: amlodipine 5mg متبقي 4 علب فقط (تحت العتبة).
- إعادة صرف: المريض #C-0876 يستهلك lantus، اليوم 26 من دورة 30 يوم.
- استيراد bulk: 3 أصناف جديدة من ملف الاصناف2030.xls تحتاج تصنيف.

ولّد قائمة تنفيذ موحّدة لجدول agent_actions.`;

function OrchestratorRunner() {
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (loading || !input.trim()) return;
    setLoading(true); setErr(null); setActions([]); setRaw("");
    try {
      const res = await ask({ data: { mode: "orchestrator", messages: [{ role: "user", content: input }] } });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setActions(parsed as Action[]);
      toast.success(`تم توليد ${parsed.length} إجراء`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل التنفيذ";
      setErr(msg); toast.error("خطأ", { description: msg });
    } finally { setLoading(false); }
  }

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
    for (const a of actions) c[a.execution_priority] = (c[a.execution_priority] ?? 0) + 1;
    return c;
  }, [actions]);

  function exportJSON() {
    if (!actions.length) return;
    const blob = new Blob([JSON.stringify(actions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agent_actions_${Date.now()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> رجوع للوحة الإدارة
        </Link>

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-800 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Cpu className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">مركز التنسيق الأعلى 🧠</h1>
              <p className="text-xs text-white/85">Master AI Automation Hub — يولّد سجلات agent_actions موحّدة عبر 4 خطوط أنابيب.</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <label className="mb-2 block text-xs font-bold text-muted-foreground">صِف الحالة الراهنة للنظام (وصفات، مخزون، refill، استيراد)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button" onClick={run} disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "جاري التنسيق..." : "تشغيل المنسّق الأعلى"}
            </button>
            <button type="button" onClick={exportJSON} disabled={!actions.length} className="ms-auto inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-40">
              <Download className="size-3" /> تصدير JSON
            </button>
          </div>
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <ShieldCheck className="size-3" /> كل الإجراءات تتطلب موافقة بشرية قبل التنفيذ الفعلي على قاعدة البيانات.
          </p>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-black">فشل التحليل</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px]">{raw}</pre>}
          </div>
        )}

        {actions.length > 0 && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black">سجلات agent_actions المُولَّدة</h2>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">حرج: {counts.CRITICAL}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">عالي: {counts.HIGH}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">متوسط: {counts.MEDIUM}</span>
              </div>
            </div>
            <ul className="space-y-3">
              {actions.map((a) => (
                <li key={a.action_id} className={`rounded-xl border p-3 ${PRIO_STYLES[a.execution_priority] ?? "border-border"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-white/70 px-2 py-0.5">{a.execution_priority}</span>
                    <span className={`rounded-full px-2 py-0.5 ${AGENT_STYLES[a.originating_agent] ?? "bg-secondary"}`}>{a.originating_agent}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5">→ {a.target_table}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5">{a.payload_data.action_type}</span>
                    {a.payload_data.customer_id && <span className="rounded-full bg-white/70 px-2 py-0.5" dir="ltr">#{a.payload_data.customer_id}</span>}
                    {a.human_approval_required && <span className="ms-auto rounded-full bg-white/80 px-2 py-0.5 text-foreground">يتطلب موافقة</span>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.payload_data.compiled_content_arabic}</p>
                  <div className="mt-1 text-[10px] opacity-70" dir="ltr">action_id: {a.action_id}</div>
                </li>
              ))}
            </ul>
            <details className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
              <summary className="cursor-pointer font-bold">عرض JSON الخام</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap" dir="ltr">{raw}</pre>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
