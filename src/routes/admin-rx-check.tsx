import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { parseSignedUrl, formatExpiry, checkUrlReachable, regenerateSignedUrl } from "@/lib/rx-url";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Play, ShieldAlert, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/admin-rx-check")({
  head: () => ({ meta: [{ title: "فحص روابط الروشتات — الإدارة" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: RxCheckPage,
});

type Row = {
  rxId: string;
  customer: string;
  url: string;
  index: number;
  expiresAt: Date | null;
  expired: boolean;
  expiryLabel: string;
  expiryTone: "ok" | "warn" | "expired" | "unknown";
  status?: "pending" | "ok" | "fail";
  httpStatus?: number | null;
  ms?: number;
  error?: string;
};

function RxCheckPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [regenBusy, setRegenBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, customer_name, image_urls")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const out: Row[] = [];
      for (const r of data ?? []) {
        (r.image_urls ?? []).forEach((u: string, i: number) => {
          const info = parseSignedUrl(u);
          const f = formatExpiry(info);
          out.push({
            rxId: r.id, customer: r.customer_name, url: u, index: i + 1,
            expiresAt: info.expiresAt, expired: info.expired,
            expiryLabel: f.label, expiryTone: f.tone,
          });
        });
      }
      setRows(out);
      setDone(0);
    } catch (e: any) {
      toast.error(e?.message || "تعذر تحميل الروشتات");
    } finally { setLoading(false); }
  }

  async function runChecks() {
    if (rows.length === 0) return;
    setRunning(true);
    setDone(0);
    setRows((r) => r.map((x) => ({ ...x, status: "pending", httpStatus: undefined, ms: undefined, error: undefined })));
    // Limit concurrency to 6.
    const queue = [...rows.keys()];
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length > 0) {
        const i = queue.shift()!;
        const url = rows[i].url;
        const res = await checkUrlReachable(url);
        setRows((cur) => {
          const next = cur.slice();
          next[i] = { ...next[i], status: res.ok ? "ok" : "fail", httpStatus: res.status, ms: res.ms, error: res.error };
          return next;
        });
        setDone((d) => d + 1);
      }
    });
    await Promise.all(workers);
    setRunning(false);
  }

  async function regenOne(row: Row, idx: number) {
    setRegenBusy(`${row.rxId}-${row.index}`);
    try {
      const fresh = await regenerateSignedUrl(row.url);
      // Update DB row: replace this url in array.
      const { data, error: e1 } = await supabase.from("prescriptions").select("image_urls").eq("id", row.rxId).single();
      if (e1 || !data) throw e1 || new Error("not found");
      const urls: string[] = (data.image_urls ?? []).slice();
      urls[row.index - 1] = fresh;
      const { error: e2 } = await supabase.from("prescriptions").update({ image_urls: urls }).eq("id", row.rxId);
      if (e2) throw e2;
      const info = parseSignedUrl(fresh);
      const f = formatExpiry(info);
      setRows((cur) => {
        const next = cur.slice();
        next[idx] = { ...next[idx], url: fresh, expiresAt: info.expiresAt, expired: info.expired, expiryLabel: f.label, expiryTone: f.tone, status: undefined };
        return next;
      });
      toast.success("تم تجديد الرابط");
    } catch (e: any) {
      toast.error(e?.message || "فشل التجديد");
    } finally { setRegenBusy(null); }
  }

  const total = rows.length;
  const okCount = rows.filter((r) => r.status === "ok").length;
  const failCount = rows.filter((r) => r.status === "fail").length;
  const expiredCount = rows.filter((r) => r.expired).length;

  function exportCSV() {
    if (rows.length === 0) return;
    const headers = ["الروشتة", "العميل", "#", "الرابط", "ينتهي في", "صالحية", "حالة الفحص", "HTTP", "الزمن (ms)", "الخطأ"];
    const data = rows.map((r) => [
      r.rxId, r.customer, r.index, r.url,
      r.expiresAt ? r.expiresAt.toISOString() : "",
      r.expired ? "منتهي" : (r.expiryTone === "warn" ? "ينتهي قريباً" : "صالح"),
      r.status === "ok" ? "سليم" : r.status === "fail" ? "فشل" : "—",
      r.httpStatus ?? "", r.ms ?? "", r.error ?? "",
    ]);
    downloadCSV(`rx-check-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
    toast.success(`تم تصدير ${rows.length} صف`);
  }

  function exportPDF() {
    if (rows.length === 0) return;
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const rowsHtml = rows.map((r) => `<tr class="${r.expired ? "ex" : r.expiryTone === "warn" ? "wa" : ""}">
      <td dir="ltr">${esc(r.rxId)}</td><td>${esc(r.customer)}</td><td>${r.index}</td>
      <td>${r.expired ? "منتهي" : (r.expiryTone === "warn" ? "ينتهي قريباً" : "صالح")}</td>
      <td dir="ltr">${esc(r.expiresAt ? r.expiresAt.toLocaleString("ar-EG") : "—")}</td>
      <td>${r.status === "ok" ? "سليم" : r.status === "fail" ? "فشل" : "—"}</td>
      <td dir="ltr">${esc(r.httpStatus ?? "—")}</td><td dir="ltr">${esc(r.ms ?? "—")}</td>
      <td>${esc(r.error ?? "")}</td>
    </tr>`).join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<title>تقرير فحص روابط الروشتات</title><style>
@page { size: A4 landscape; margin: 12mm; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; }
.head { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
.head h1 { margin:0; font-size:18px; color:#0f766e; }
.meta { font-size:11px; color:#475569; }
table { width:100%; border-collapse:collapse; font-size:10px; }
th, td { border:1px solid #cbd5e1; padding:4px 6px; text-align:right; vertical-align:top; }
th { background:#f1f5f9; font-weight:800; }
tr.ex td { background:#fee2e2; } tr.wa td { background:#fef3c7; }
.footer { margin-top:10px; font-size:10px; color:#64748b; text-align:center; }
.no-print { position: fixed; top: 10px; left: 10px; }
.no-print button { background:#0d9488; color:white; border:0; padding:8px 14px; border-radius:8px; font-weight:800; cursor:pointer; }
@media print { .no-print { display:none; } }
</style></head><body>
<div class="no-print"><button onclick="window.print()">طباعة / حفظ PDF</button></div>
<div class="head"><h1>تقرير فحص روابط الروشتات</h1>
<div class="meta">إجمالي: ${rows.length} · منتهية: ${expiredCount} · فحص ناجح: ${okCount} · فحص فاشل: ${failCount} · تاريخ: ${new Date().toLocaleString("ar-EG")}</div></div>
<table><thead><tr>
<th>الروشتة</th><th>العميل</th><th>#</th><th>الصلاحية</th><th>ينتهي في</th><th>حالة الفحص</th><th>HTTP</th><th>الزمن (ms)</th><th>الخطأ</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">صيدلية المصلي — تقرير داخلي</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>
</body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) { toast.error("تعذر فتح نافذة الطباعة — تحقق من حاجب النوافذ المنبثقة"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    toast.success(`تم تجهيز PDF لـ ${rows.length} صف`);
  }


  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">فحص روابط الروشتات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              أداة داخلية للتحقق من صلاحية روابط صور الروشتات قبل مشاركتها مع الإدارة، مع إمكانية تجديد الرابط فورياً.
            </p>
          </div>
          <Link to="/admin" className="rounded-xl bg-secondary px-3 py-2 text-xs font-black hover:bg-accent">← لوحة الإدمن</Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading || running}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            تحميل الروشتات
          </button>
          <button onClick={runChecks} disabled={running || rows.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            بدء الفحص ({rows.length})
          </button>
          <button onClick={exportCSV} disabled={rows.length === 0}
            data-testid="rxcheck-export-csv"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            <Download className="size-4" /> CSV
          </button>
          <button onClick={exportPDF} disabled={rows.length === 0}
            data-testid="rxcheck-export-pdf"
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            <FileText className="size-4" /> PDF
          </button>
          {running && <span className="text-xs text-muted-foreground">{done}/{total}</span>}
        </div>


        {total > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="إجمالي الروابط" value={total} tone="default" />
            <Stat label="منتهية الصلاحية" value={expiredCount} tone={expiredCount ? "rose" : "default"} />
            <Stat label="فحص ناجح" value={okCount} tone={okCount ? "emerald" : "default"} />
            <Stat label="فحص فاشل" value={failCount} tone={failCount ? "rose" : "default"} />
          </div>
        )}

        <div className="overflow-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary text-[11px] font-black">
              <tr>
                <th className="px-3 py-2">الروشتة</th>
                <th className="px-3 py-2">العميل</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">انتهاء الرابط</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">HTTP</th>
                <th className="px-3 py-2">الزمن</th>
                <th className="px-3 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">اضغط "تحميل الروشتات" للبدء.</td></tr>
              )}
              {rows.map((r, idx) => (
                <tr key={`${r.rxId}-${r.index}`} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-bold" dir="ltr">{r.rxId}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.index}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      r.expiryTone === "expired" ? "bg-rose-100 text-rose-700" :
                      r.expiryTone === "warn" ? "bg-amber-100 text-amber-700" :
                      r.expiryTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
                    }`}>
                      {r.expiryTone === "expired" ? <ShieldAlert className="size-3" /> : r.expiryTone === "warn" ? <Clock className="size-3" /> : null}
                      {r.expiryLabel}
                    </span>
                    {r.expiresAt && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">{r.expiresAt.toLocaleString("ar-EG")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "pending" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                    {r.status === "ok" && <span className="inline-flex items-center gap-1 text-emerald-700 font-black"><CheckCircle2 className="size-3.5" /> سليم</span>}
                    {r.status === "fail" && <span className="inline-flex items-center gap-1 text-rose-700 font-black" title={r.error}><XCircle className="size-3.5" /> فشل</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.httpStatus ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.ms != null ? `${r.ms}ms` : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <a href={r.url} target="_blank" rel="noreferrer" className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold hover:bg-accent">فتح</a>
                      <button
                        onClick={() => regenOne(r, idx)}
                        disabled={regenBusy === `${r.rxId}-${r.index}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        {regenBusy === `${r.rxId}-${r.index}` ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        تجديد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "emerald" | "rose" }) {
  const cls = tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : "bg-secondary text-foreground";
  return (
    <div className={`rounded-xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] font-bold">{label}</p>
    </div>
  );
}
