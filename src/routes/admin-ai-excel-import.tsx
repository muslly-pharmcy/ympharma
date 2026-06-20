import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileSpreadsheet, AlertTriangle, Send, Upload } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-excel-import")({
  head: () => ({
    meta: [
      { title: "مستورد Excel السريري — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExcelImportAgentRunner,
});

type Row = {
  archived_by_agent: "import_excel_classifier" | string;
  import_status: "VALIDATED" | string;
  original_title: string;
  ai_general_classification: string;
  suggested_bundle_target: string;
  assigned_public_price: number;
  sanitized_description: string;
};

const BUNDLE_STYLES: Record<string, string> = {
  "باقة السكري": "bg-rose-100 text-rose-800",
  "باقة الضغط": "bg-sky-100 text-sky-800",
  "باقة الفيتامينات": "bg-emerald-100 text-emerald-800",
  "باقة الأطفال": "bg-amber-100 text-amber-900",
  none: "bg-secondary text-foreground",
};

const SAMPLE = `[
  { "product_title": "Glucophage 500mg", "category_hint": "سكري", "description_arabic": "منظم سكر فموي", "public_price": 1500 },
  { "product_title": "Centrum Adults", "category_hint": "مكملات", "description_arabic": "ملتي فيتامين يومي", "public_price": 4800 }
]`;

// Minimal CSV parser supporting quoted fields
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field.length || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => v.trim().length)).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    return o;
  });
}

function ExcelImportAgentRunner() {
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  function normalizePayload(text: string): unknown[] {
    const t = text.trim();
    if (!t) throw new Error("الإدخال فارغ");
    if (t.startsWith("[") || t.startsWith("{")) {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    // CSV path — strip supplier columns
    const parsed = parseCSV(t).map((r) => {
      const clean: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(r)) {
        const key = k.toLowerCase();
        if (key.includes("supplier") || key.includes("cost_price")) continue;
        if (key === "public_price") clean[k] = Number(v) || 0;
        else clean[k] = v;
      }
      return clean;
    });
    if (!parsed.length) throw new Error("لا توجد صفوف صالحة في CSV");
    return parsed;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("الحد الأقصى 2 ميجابايت لملف CSV/JSON");
      return;
    }
    const text = await f.text();
    setInput(text);
    toast.success(`تم تحميل ${f.name}`);
  }

  async function run() {
    if (loading || !input.trim()) return;
    setLoading(true);
    setErr(null);
    setRows([]);
    setRaw("");
    try {
      const payload = normalizePayload(input);
      const userMsg = `صنّف الصفوف التالية وأرشفها باسم الوكيل import_excel_classifier:\n\n${JSON.stringify(payload, null, 2)}`;
      const res = await ask({
        data: { mode: "excel_import", messages: [{ role: "user", content: userMsg }] },
      });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRows(parsed as Row[]);
      toast.success(`تم تصنيف وأرشفة ${parsed.length} منتج`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر معالجة الإدخال";
      setErr(msg);
      toast.error("خطأ في الاستيراد", { description: msg });
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

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><FileSpreadsheet className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">مستورد Excel السريري 📊</h1>
              <p className="text-xs text-white/85">تصنيف طبي آلي + أرشفة تدقيق باسم <code className="text-[10px]">import_excel_classifier</code></p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-muted-foreground">
              ألصق JSON أو CSV (الأعمدة: product_title, category_hint, description_arabic, public_price)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-1 text-[11px] font-bold hover:bg-secondary">
              <Upload className="size-3" /> رفع ملف
              <input type="file" accept=".csv,.json,.txt" className="hidden" onChange={onFile} />
            </label>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            dir="ltr"
            className="w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 font-mono text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !input.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {loading ? "جاري التصنيف والأرشفة..." : "تشغيل الاستيراد الذكي"}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            🛡️ أعمدة supplier_cost / supplier_name / cost_price تُحذف تلقائيًا قبل الإرسال.
          </p>
        </section>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل التحليل</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-black">المنتجات المُصنَّفة والمؤرشَفة</h2>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد سجلات بعد. ألصق صفوفًا واضغط "تشغيل".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="text-[11px] uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pe-2 font-black">المنتج</th>
                    <th className="py-2 pe-2 font-black">التصنيف الطبي</th>
                    <th className="py-2 pe-2 font-black">الباقة</th>
                    <th className="py-2 pe-2 font-black">السعر</th>
                    <th className="py-2 pe-2 font-black">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/60 align-top">
                      <td className="py-2 pe-2">
                        <div className="text-xs font-black">{r.original_title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{r.sanitized_description}</div>
                      </td>
                      <td className="py-2 pe-2 text-xs">{r.ai_general_classification}</td>
                      <td className="py-2 pe-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${BUNDLE_STYLES[r.suggested_bundle_target] ?? "bg-secondary text-foreground"}`}>
                          {r.suggested_bundle_target}
                        </span>
                      </td>
                      <td className="py-2 pe-2 text-xs font-bold">{r.assigned_public_price} ر.ي</td>
                      <td className="py-2 pe-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                          {r.import_status}
                        </span>
                        <div className="mt-1 text-[10px] text-muted-foreground" dir="ltr">{r.archived_by_agent}</div>
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
