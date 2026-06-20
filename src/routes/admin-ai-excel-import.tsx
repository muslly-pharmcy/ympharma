import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
// xlsx is lazy-loaded on demand inside handlers to keep it out of the initial admin chunk.
type XLSXModule = typeof import("xlsx");
let _xlsxPromise: Promise<XLSXModule> | null = null;
const loadXLSX = () => (_xlsxPromise ??= import("xlsx"));
import {
  ArrowLeft, Loader2, FileSpreadsheet, AlertTriangle, Send, Upload,
  Download, FileJson, Sheet, Bell, ShieldCheck,
} from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";

export const Route = createFileRoute("/admin-ai-excel-import")({
  head: () => ({
    meta: [
      { title: "مستورد Excel السريري — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<AdminGate><ExcelImportAgentRunner /></AdminGate>),
});

type Row = {
  archived_by_agent: string;
  import_status: string;
  product_code?: number | null;
  original_title: string;
  ai_general_classification: string;
  suggested_bundle_target: string;
  assigned_public_price?: number | null;
  current_stock?: number | null;
  expiry_date?: string | null;
  logistics_alert_arabic?: string | null;
  sanitized_description: string;
};

const BUNDLE_STYLES: Record<string, string> = {
  "باقة السكري": "bg-rose-100 text-rose-800",
  "باقة الضغط": "bg-sky-100 text-sky-800",
  "باقة الفيتامينات": "bg-emerald-100 text-emerald-800",
  "باقة الأطفال": "bg-amber-100 text-amber-900",
  none: "bg-secondary text-foreground",
};

// أعمدة الخصوصية الممنوعة من الإرسال والتصدير
const FORBIDDEN_KEYS = [
  "supplier", "supplier_name", "supplier_cost", "cost_price", "cost",
  "wholesale", "المورد", "القيمة", "قيمة", "سعر التكلفة", "التكلفة",
];

function isForbidden(key: string) {
  const k = key.toLowerCase().trim();
  return FORBIDDEN_KEYS.some((f) => k.includes(f.toLowerCase()));
}

const SAMPLE = `[
  {"product_title": "Glucophage 500mg", "category_hint": "سكري", "description_arabic": "منظم سكر فموي", "public_price": 1500, "current_stock": 8, "expiry_date": "01/03/2026"},
  {"product_title": "Centrum Adults", "category_hint": "مكملات", "description_arabic": "ملتي فيتامين يومي", "public_price": 4800, "current_stock": 42, "expiry_date": "01/01/2028"}
]`;

// ---------- Minimal CSV parser ----------
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = "", inQ = false;
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

// ---------- Local deterministic bundle rules (highlight + fallback) ----------
const BUNDLE_RULES: { bundle: string; keywords: string[] }[] = [
  { bundle: "باقة السكري", keywords: ["metformin","glucophage","ميتفورمين","جلوكوفاج","januvia","جانوفيا","gliclazide","جليكلازيد","insulin","إنسولين","شرائح سكر","accu-chek","اكيوتشيك","lantus","لانتوس","amaryl","اماريل","sitagliptin"] },
  { bundle: "باقة الضغط", keywords: ["amlodipine","أملوديبين","concor","كونكور","bisoprolol","losartan","لوسارتان","valsartan","فالسارتان","captopril","كابتوبريل","فاركوبريل","enalapril","atenolol","hydrochlorothiazide","ramipril","nifedipine","isosorbide","إيزوسوربيد","ايزوماك"] },
  { bundle: "باقة الفيتامينات", keywords: ["vitamin","فيتامين","multivitamin","centrum","سنتروم","zinc","زنك","omega","أوميغا","calcium","كالسيوم","iron","حديد","folic","فوليك","b12","b complex","vit c","vit d","d3","biotin","بيوتين"] },
  { bundle: "باقة الأطفال", keywords: ["pediatric","أطفال","شراب أطفال","baby","طفل","رضع","infant","حفاضات","gripe water","جريب ووتر","ferrous drops","نقط أطفال","calpol","كالبول","بانادول شراب"] },
];

function ruleBundleFor(title: string): string {
  const t = title.toLowerCase();
  for (const r of BUNDLE_RULES) for (const k of r.keywords) if (t.includes(k.toLowerCase())) return r.bundle;
  return "none";
}

// ---------- Expiry & stock priority ----------
function parseExpiry(s?: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) { const [_, d, mo, y] = m; const dt = new Date(+y, +mo - 1, +d); return isNaN(+dt) ? null : dt; }
  const dt = new Date(s); return isNaN(+dt) ? null : dt;
}

type Severity = "critical" | "warning" | "ok";
function severityFor(r: Row): { sev: Severity; reasons: string[] } {
  const reasons: string[] = [];
  const stock = typeof r.current_stock === "number" ? r.current_stock : null;
  const exp = parseExpiry(r.expiry_date);
  const now = new Date();
  let sev: Severity = "ok";
  if (exp) {
    if (exp.getFullYear() > 2100) reasons.push("تاريخ صلاحية غير منطقي");
    else {
      const days = Math.floor((+exp - +now) / 86400000);
      if (days < 0) { sev = "critical"; reasons.push(`منتهي منذ ${-days} يوم`); }
      else if (days <= 90) { sev = "critical"; reasons.push(`ينتهي خلال ${days} يوم`); }
      else if (days <= 180) { sev = "warning"; reasons.push(`ينتهي خلال ${days} يوم`); }
    }
  }
  if (stock !== null) {
    if (stock <= 5) { sev = "critical"; reasons.push(`مخزون منخفض جدًا (${stock})`); }
    else if (stock <= 15 && sev !== "critical") { sev = "warning"; reasons.push(`مخزون منخفض (${stock})`); }
  }
  return { sev, reasons };
}

const SEV_STYLES: Record<Severity, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-300",
  warning: "bg-amber-100 text-amber-900 border-amber-300",
  ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
};
const SEV_LABEL: Record<Severity, string> = { critical: "🚨 حرج", warning: "⚠️ تنبيه", ok: "✅ آمن" };
const SEV_RANK: Record<Severity, number> = { critical: 0, warning: 1, ok: 2 };

// ---------- Downloads ----------
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

function sanitizeRowForExport(r: Row): Record<string, unknown> {
  const o: Record<string, unknown> = {
    code: r.product_code ?? "",
    title: r.original_title,
    classification: r.ai_general_classification,
    bundle: r.suggested_bundle_target,
    price: r.assigned_public_price ?? "",
    stock: r.current_stock ?? "",
    expiry: r.expiry_date ?? "",
    logistics_alert: r.logistics_alert_arabic ?? "",
    description: r.sanitized_description,
    status: r.import_status,
    archived_by: r.archived_by_agent,
  };
  for (const k of Object.keys(o)) if (isForbidden(k)) delete o[k];
  return o;
}

function rowsToCSV(rows: Row[]): string {
  const data = rows.map(sanitizeRowForExport);
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...data.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function ExcelImportAgentRunner() {
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Sanitize any record by removing forbidden keys recursively (top level enough)
  function sanitize(o: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (isForbidden(k)) continue;
      out[k] = v;
    }
    return out;
  }

  function normalizePayload(text: string): unknown[] {
    const t = text.trim();
    if (!t) throw new Error("الإدخال فارغ");
    if (t.startsWith("[") || t.startsWith("{")) {
      const parsed = JSON.parse(t);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((r) => (r && typeof r === "object" ? sanitize(r as Record<string, unknown>) : r));
    }
    const parsed = parseCSV(t).map((r) => sanitize(r));
    if (!parsed.length) throw new Error("لا توجد صفوف صالحة في CSV");
    return parsed;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى 5 ميجابايت"); return; }
    const name = f.name.toLowerCase();
    try {
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await loadXLSX();
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const cleaned = json.map((r: Record<string, unknown>) => sanitize(r));
        setInput(JSON.stringify(cleaned, null, 2));
        toast.success(`تم تحميل ${f.name} — ${cleaned.length} صف (تم تجريد أعمدة الخصوصية)`);
      } else {
        const text = await f.text();
        setInput(text);
        toast.success(`تم تحميل ${f.name}`);
      }
    } catch (er) {
      toast.error("تعذّر قراءة الملف", { description: er instanceof Error ? er.message : "" });
    }
    e.target.value = "";
  }

  async function run() {
    if (loading || !input.trim()) return;
    setLoading(true); setErr(null); setRows([]); setRaw("");
    try {
      const payload = normalizePayload(input);
      const userMsg = `صنّف الصفوف التالية وأرشفها باسم الوكيل import_excel_classifier وطبّق قواعد الباقات بدقة:\n\n${JSON.stringify(payload, null, 2)}`;
      const res = await ask({ data: { mode: "excel_import", messages: [{ role: "user", content: userMsg }] } });
      const text = (res.reply ?? "").trim();
      setRaw(text);
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("الناتج ليس مصفوفة JSON");
      setRows(parsed as Row[]);
      toast.success(`تم تصنيف ${parsed.length} منتج`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر معالجة الإدخال";
      setErr(msg); toast.error("خطأ في الاستيراد", { description: msg });
    } finally { setLoading(false); }
  }

  // Alerts panel data, sorted by priority
  const alerts = useMemo(() => {
    return rows
      .map((r) => ({ row: r, ...severityFor(r) }))
      .filter((a) => a.sev !== "ok")
      .sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev]);
  }, [rows]);

  const counts = useMemo(() => {
    let c = 0, w = 0;
    for (const r of rows) { const s = severityFor(r).sev; if (s === "critical") c++; else if (s === "warning") w++; }
    return { c, w, total: rows.length };
  }, [rows]);

  function exportCSV() {
    if (!rows.length) return;
    downloadBlob(`muslly_import_${Date.now()}.csv`, new Blob(["\uFEFF" + rowsToCSV(rows)], { type: "text/csv;charset=utf-8" }));
  }
  async function exportXLSX() {
    if (!rows.length) return;
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet(rows.map(sanitizeRowForExport));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classified");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(`muslly_import_${Date.now()}.xlsx`, new Blob([buf], { type: "application/octet-stream" }));
  }
  function exportJSON() {
    if (!rows.length) return;
    const payload = rows.map((r) => {
      const o = { ...r } as Record<string, unknown>;
      for (const k of Object.keys(o)) if (isForbidden(k)) delete o[k];
      return o;
    });
    downloadBlob(`muslly_import_${Date.now()}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> رجوع للوحة الإدارة
        </Link>

        <header className="mb-5 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><FileSpreadsheet className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">مستورد Excel السريري 📊</h1>
              <p className="text-xs text-white/85">رفع ملف · تصنيف فوري · تنبيهات لوجستية · تصدير CSV / Excel / JSON</p>
            </div>
          </div>
        </header>

        {/* INPUT */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-muted-foreground">
              ألصق JSON / CSV أو ارفع ملف .xlsx / .xls / .csv / .json (الحد 5MB)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-bold hover:bg-secondary">
              <Upload className="size-3" /> رفع ملف
              <input type="file" accept=".csv,.json,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />
            </label>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            dir="ltr"
            className="w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 font-mono text-xs outline-none focus:border-primary"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button" onClick={run} disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "جاري التصنيف..." : "تشغيل الاستيراد الذكي"}
            </button>
            <div className="ms-auto inline-flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportCSV} disabled={!rows.length} className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-40">
                <Download className="size-3" /> CSV
              </button>
              <button type="button" onClick={exportXLSX} disabled={!rows.length} className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-40">
                <Sheet className="size-3" /> Excel
              </button>
              <button type="button" onClick={exportJSON} disabled={!rows.length} className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-40">
                <FileJson className="size-3" /> JSON
              </button>
            </div>
          </div>
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <ShieldCheck className="size-3" /> أعمدة supplier_cost / supplier_name / cost_price / القيمة / المورد تُحذف تلقائيًا قبل الإرسال والتصدير.
          </p>
        </section>

        {/* ERROR */}
        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-black"><AlertTriangle className="size-4" /> فشل التحليل</div>
            <p className="mt-1 text-xs">{err}</p>
            {raw && <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/60 p-2 text-[11px] leading-relaxed">{raw}</pre>}
          </div>
        )}

        {/* ALERTS PANEL */}
        {rows.length > 0 && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-black">
                <Bell className="size-4 text-rose-600" /> لوحة التنبيهات اللوجستية
              </h2>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">حرج: {counts.c}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">تنبيه: {counts.w}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">إجمالي: {counts.total}</span>
              </div>
            </div>
            {alerts.length === 0 ? (
              <p className="text-xs text-emerald-700">✅ لا توجد أصناف منخفضة أو قريبة الانتهاء.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className={`rounded-xl border p-3 text-xs ${SEV_STYLES[a.sev]}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-black">{SEV_LABEL[a.sev]} — {a.row.original_title}</div>
                      <div className="text-[10px] opacity-80">
                        {a.row.current_stock != null && <span>مخزون: {a.row.current_stock}</span>}
                        {a.row.expiry_date && <span className="ms-2">صلاحية: {a.row.expiry_date}</span>}
                      </div>
                    </div>
                    <div className="mt-1 opacity-90">{a.reasons.join(" · ")}</div>
                    {a.row.logistics_alert_arabic && <div className="mt-1 text-[11px] opacity-80">{a.row.logistics_alert_arabic}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* RESULTS TABLE */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-black">المنتجات المُصنَّفة والمؤرشَفة</h2>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد سجلات بعد. ارفع ملف أو ألصق صفوفًا واضغط "تشغيل".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="text-[11px] uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pe-2 font-black">المنتج</th>
                    <th className="py-2 pe-2 font-black">التصنيف الطبي</th>
                    <th className="py-2 pe-2 font-black">الباقة</th>
                    <th className="py-2 pe-2 font-black">السعر</th>
                    <th className="py-2 pe-2 font-black">المخزون / الصلاحية</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const ruleHint = ruleBundleFor(r.original_title);
                    const mismatch = ruleHint !== "none" && r.suggested_bundle_target !== ruleHint;
                    return (
                      <tr key={i} className="border-b border-border/60 align-top">
                        <td className="py-2 pe-2">
                          <div className="text-xs font-black">{r.original_title}</div>
                          {r.product_code != null && <div className="text-[10px] text-muted-foreground" dir="ltr">#{r.product_code}</div>}
                          <div className="text-[11px] text-muted-foreground line-clamp-2">{r.sanitized_description}</div>
                        </td>
                        <td className="py-2 pe-2 text-xs">{r.ai_general_classification}</td>
                        <td className="py-2 pe-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${BUNDLE_STYLES[r.suggested_bundle_target] ?? "bg-secondary text-foreground"}`}>
                            {r.suggested_bundle_target}
                          </span>
                          {mismatch && <div className="mt-1 text-[10px] text-amber-700">اقترح المحرّك: {ruleHint}</div>}
                        </td>
                        <td className="py-2 pe-2 text-xs font-bold">{r.assigned_public_price ?? "—"}</td>
                        <td className="py-2 pe-2 text-[11px]">
                          {r.current_stock != null ? <div>مخزون: <b>{r.current_stock}</b></div> : <div className="text-muted-foreground">—</div>}
                          {r.expiry_date && <div className="text-muted-foreground">{r.expiry_date}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <details className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                <summary className="cursor-pointer font-bold">عرض JSON الخام</summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap" dir="ltr">{raw}</pre>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
