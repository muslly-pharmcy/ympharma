import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { parseSignedUrl, formatExpiry, checkUrlReachable, regenerateSignedUrl } from "@/lib/rx-url";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Play, ShieldAlert, Clock, Download, FileText, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv-export";
import { mirrorRxImagesFromStorage } from "@/lib/rx-backup.functions";

export const Route = createFileRoute("/admin-rx-check")({
  head: () => ({ meta: [{ title: "فحص روابط الروشتات — الإدارة" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><RxCheckPage /></AdminGate>),
});

type ExpiryTone = "ok" | "warn" | "expired" | "unknown";
type ExpiryFilter = "all" | "ok" | "warn" | "expired";

type Row = {
  rxId: string;
  customer: string;
  phone: string;
  createdAt: string;
  url: string;
  index: number;
  expiresAt: Date | null;
  expired: boolean;
  expiryLabel: string;
  expiryTone: ExpiryTone;
  status?: "pending" | "ok" | "fail";
  httpStatus?: number | null;
  ms?: number;
  error?: string;
};

const TONE_AR: Record<ExpiryTone, string> = {
  ok: "صالح",
  warn: "ينتهي قريباً",
  expired: "منتهي",
  unknown: "غير معروف",
};

function RxCheckPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [regenBusy, setRegenBusy] = useState<string | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [userEmail, setUserEmail] = useState<string>("");
  const [mirrorBusy, setMirrorBusy] = useState(false);
  const mirrorFn = useServerFn(mirrorRxImagesFromStorage);

  async function runMirror() {
    setMirrorBusy(true);
    try {
      const res = await mirrorFn({ data: { limit: 100 } }) as {
        ok: boolean; scanned: number; mirrored: number; skipped: number; failed: number;
      };
      toast.success(`المرآة: نسخ ${res.mirrored} / تم تخطي ${res.skipped} / فشل ${res.failed} (مسح ${res.scanned})`);
    } catch (e: any) {
      toast.error(e?.message || "فشل تشغيل مرآة الصور");
    } finally { setMirrorBusy(false); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? "");
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, customer_name, customer_phone, image_urls, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const out: Row[] = [];
      for (const r of data ?? []) {
        (r.image_urls ?? []).forEach((u: string, i: number) => {
          const info = parseSignedUrl(u);
          const f = formatExpiry(info);
          out.push({
            rxId: r.id,
            customer: r.customer_name,
            phone: r.customer_phone ?? "",
            createdAt: r.created_at,
            url: u,
            index: i + 1,
            expiresAt: info.expiresAt,
            expired: info.expired,
            expiryLabel: f.label,
            expiryTone: f.tone,
          });
        });
      }
      setRows(out);
      setDone(0);
    } catch (e: any) {
      toast.error(e?.message || "تعذر تحميل الروشتات");
    } finally { setLoading(false); }
  }

  // Apply expiry filter consistently with admin-side rxExpiryStatus
  // (which uses the same parseSignedUrl + 3-day soon threshold via formatExpiry).
  const visibleRows = useMemo(
    () => (expiryFilter === "all" ? rows : rows.filter((r) => r.expiryTone === expiryFilter)),
    [rows, expiryFilter],
  );

  async function runChecks() {
    if (visibleRows.length === 0) return;
    setRunning(true);
    setDone(0);
    // Map row identity to index in full list.
    const idxs = visibleRows.map((vr) => rows.findIndex((r) => r === vr));
    setRows((r) => r.map((x, i) => (idxs.includes(i) ? { ...x, status: "pending", httpStatus: undefined, ms: undefined, error: undefined } : x)));
    const queue = [...idxs];
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

  const total = visibleRows.length;
  const okCount = visibleRows.filter((r) => r.status === "ok").length;
  const failCount = visibleRows.filter((r) => r.status === "fail").length;
  const expiredCount = visibleRows.filter((r) => r.expiryTone === "expired").length;
  const warnCount = visibleRows.filter((r) => r.expiryTone === "warn").length;
  const validCount = visibleRows.filter((r) => r.expiryTone === "ok").length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  function exportCSV() {
    if (visibleRows.length === 0) return;
    const headers = [
      "معرف الروشتة",
      "اسم المريض",
      "رقم الهاتف",
      "تاريخ الرفع",
      "حالة الصلاحية",
      "تاريخ الانتهاء",
      "#صورة",
      "حالة الفحص",
      "HTTP",
      "زمن (ms)",
      "خطأ",
    ];
    const data = visibleRows.map((r) => [
      r.rxId,
      r.customer,
      r.phone,
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      TONE_AR[r.expiryTone],
      r.expiresAt ? r.expiresAt.toISOString() : "",
      r.index,
      r.status === "ok" ? "سليم" : r.status === "fail" ? "فشل" : "—",
      r.httpStatus ?? "",
      r.ms ?? "",
      r.error ?? "",
    ]);
    downloadCSV(`rx-check-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
    toast.success(`تم تصدير ${visibleRows.length} صف`);
  }

  function exportPDF() {
    if (visibleRows.length === 0) return;
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const rowsHtml = visibleRows.map((r) => `<tr class="${r.expiryTone === "expired" ? "ex" : r.expiryTone === "warn" ? "wa" : ""}">
      <td dir="ltr">${esc(r.rxId)}</td>
      <td>${esc(r.customer)}</td>
      <td dir="ltr">${esc(r.phone || "—")}</td>
      <td dir="ltr">${esc(r.createdAt ? new Date(r.createdAt).toLocaleString("ar-EG") : "—")}</td>
      <td>${TONE_AR[r.expiryTone]}</td>
      <td dir="ltr">${esc(r.expiresAt ? r.expiresAt.toLocaleString("ar-EG") : "—")}</td>
      <td>${r.status === "ok" ? "سليم" : r.status === "fail" ? "فشل" : "—"}</td>
      <td dir="ltr">${esc(r.httpStatus ?? "—")}</td>
      <td dir="ltr">${esc(r.ms ?? "—")}</td>
    </tr>`).join("");

    const filterLabel = expiryFilter === "all" ? "كل الروابط" : TONE_AR[expiryFilter as ExpiryTone];
    const generated = new Date().toLocaleString("ar-EG");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<title>تقرير فحص روابط الروشتات</title><style>
@page { size: A4 landscape; margin: 12mm; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; }
.head { border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px; }
.head-row { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.head h1 { margin:0; font-size:18px; color:#0f766e; }
.meta { font-size:11px; color:#475569; line-height:1.7; }
.meta b { color:#0f172a; }
.bar { display:flex; height:14px; border-radius:7px; overflow:hidden; border:1px solid #cbd5e1; margin-top:8px; }
.bar > div { display:flex; align-items:center; justify-content:center; color:white; font-size:9px; font-weight:800; }
.bar .v { background:#10b981; } .bar .w { background:#f59e0b; } .bar .e { background:#ef4444; }
.legend { margin-top:6px; display:flex; gap:14px; font-size:11px; }
.legend span { display:inline-flex; align-items:center; gap:4px; }
.legend i { width:10px; height:10px; border-radius:2px; display:inline-block; }
table { width:100%; border-collapse:collapse; font-size:10px; }
th, td { border:1px solid #cbd5e1; padding:4px 6px; text-align:right; vertical-align:top; }
th { background:#f1f5f9; font-weight:800; }
tr.ex td { background:#fee2e2; } tr.wa td { background:#fef3c7; }
.footer { position:fixed; bottom:6mm; left:12mm; right:12mm; border-top:1px solid #cbd5e1; padding-top:6px; font-size:9px; color:#64748b; display:flex; justify-content:space-between; }
.no-print { position: fixed; top: 10px; left: 10px; }
.no-print button { background:#0d9488; color:white; border:0; padding:8px 14px; border-radius:8px; font-weight:800; cursor:pointer; }
@media print { .no-print { display:none; } }
</style></head><body>
<div class="no-print"><button onclick="window.print()">طباعة / حفظ PDF</button></div>
<div class="head">
  <div class="head-row">
    <div>
      <h1>تقرير فحص روابط الروشتات</h1>
      <div class="meta">صيدلية المصلي — تقرير داخلي</div>
    </div>
    <div class="meta" style="text-align:left">
      <div><b>تاريخ التوليد:</b> ${esc(generated)}</div>
      <div><b>المستخدم:</b> ${esc(userEmail || "—")}</div>
      <div><b>الفلتر:</b> ${esc(filterLabel)}</div>
      <div><b>إجمالي السجلات:</b> ${total}</div>
    </div>
  </div>
  <div class="bar">
    ${validCount > 0 ? `<div class="v" style="width:${pct(validCount)}%">${pct(validCount)}%</div>` : ""}
    ${warnCount > 0 ? `<div class="w" style="width:${pct(warnCount)}%">${pct(warnCount)}%</div>` : ""}
    ${expiredCount > 0 ? `<div class="e" style="width:${pct(expiredCount)}%">${pct(expiredCount)}%</div>` : ""}
  </div>
  <div class="legend">
    <span><i style="background:#10b981"></i>صالح: ${validCount} (${pct(validCount)}%)</span>
    <span><i style="background:#f59e0b"></i>ينتهي قريباً: ${warnCount} (${pct(warnCount)}%)</span>
    <span><i style="background:#ef4444"></i>منتهي: ${expiredCount} (${pct(expiredCount)}%)</span>
  </div>
</div>
<table><thead><tr>
<th>الروشتة</th><th>المريض</th><th>الهاتف</th><th>تاريخ الرفع</th><th>الصلاحية</th><th>ينتهي في</th><th>الفحص</th><th>HTTP</th><th>زمن (ms)</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">
  <span>صيدلية المصلي · تقرير فحص روابط الروشتات</span>
  <span>المستخدم: ${esc(userEmail || "—")}</span>
  <span>${esc(generated)}</span>
</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>
</body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) { toast.error("تعذر فتح نافذة الطباعة — تحقق من حاجب النوافذ المنبثقة"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    toast.success(`تم تجهيز PDF لـ ${visibleRows.length} صف`);
  }

  const filters: { v: ExpiryFilter; label: string }[] = [
    { v: "all", label: "الكل" },
    { v: "ok", label: "صالح" },
    { v: "warn", label: "ينتهي قريباً" },
    { v: "expired", label: "منتهي" },
  ];

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
          <button onClick={runChecks} disabled={running || visibleRows.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            بدء الفحص ({visibleRows.length})
          </button>
          <button onClick={exportCSV} disabled={visibleRows.length === 0}
            data-testid="rxcheck-export-csv"
            title="تنزيل CSV: معرف الروشتة، المريض، الهاتف، تاريخ الرفع، الصلاحية، تاريخ الانتهاء"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50 shadow-card">
            <Download className="size-4" /> تنزيل CSV
          </button>
          <button onClick={exportPDF} disabled={visibleRows.length === 0}
            data-testid="rxcheck-export-pdf"
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50 shadow-card">
            <FileText className="size-4" /> تنزيل PDF
          </button>
          <button onClick={runMirror} disabled={mirrorBusy}
            data-testid="rxcheck-mirror-now"
            title="نسخ صور الروشتات من Storage إلى prescription_image_blobs (نسخة احتياطية داخل قاعدة البيانات)"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50 shadow-card">
            {mirrorBusy ? <Loader2 className="size-4 animate-spin" /> : <HardDriveDownload className="size-4" />}
            مرآة الصور الآن
          </button>
          {running && <span className="text-xs text-muted-foreground">{done}/{rows.filter((r) => r.status === "pending").length || total}</span>}
        </div>

        {/* Expiry filter — aligned with admin-side rxExpiryStatus (formatExpiry tones). */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">الصلاحية:</span>
          {filters.map((f) => (
            <button
              key={f.v}
              onClick={() => setExpiryFilter(f.v)}
              data-testid={`rxcheck-filter-${f.v}`}
              className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${expiryFilter === f.v ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}
            >
              {f.label}
            </button>
          ))}
          {expiryFilter !== "all" && (
            <span className="text-[11px] text-muted-foreground">يعرض {visibleRows.length} من {rows.length}</span>
          )}
        </div>

        {total > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="الإجمالي" value={total} tone="default" />
            <Stat label="صالح" value={validCount} tone={validCount ? "emerald" : "default"} />
            <Stat label="ينتهي قريباً" value={warnCount} tone={warnCount ? "amber" : "default"} />
            <Stat label="منتهي" value={expiredCount} tone={expiredCount ? "rose" : "default"} />
            <Stat label="فحص فاشل" value={failCount} tone={failCount ? "rose" : "default"} />
          </div>
        )}

        <div className="overflow-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary text-[11px] font-black">
              <tr>
                <th className="px-3 py-2">الروشتة</th>
                <th className="px-3 py-2">المريض</th>
                <th className="px-3 py-2">الهاتف</th>
                <th className="px-3 py-2">رفعت في</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">انتهاء الرابط</th>
                <th className="px-3 py-2">الفحص</th>
                <th className="px-3 py-2">HTTP</th>
                <th className="px-3 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">
                  {rows.length === 0 ? "اضغط \"تحميل الروشتات\" للبدء." : "لا توجد روابط مطابقة لهذا الفلتر."}
                </td></tr>
              )}
              {visibleRows.map((r) => {
                const idx = rows.indexOf(r);
                return (
                <tr key={`${r.rxId}-${r.index}`} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-bold" dir="ltr">{r.rxId.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.phone || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG") : "—"}</td>
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
                    {r.status && r.ms != null && <div className="text-[10px] text-muted-foreground" dir="ltr">{r.ms}ms</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.httpStatus ?? "—"}</td>
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
              );})}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "emerald" | "rose" | "amber" }) {
  const cls = tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : tone === "amber" ? "bg-amber-50 text-amber-700"
    : "bg-secondary text-foreground";
  return (
    <div className={`rounded-xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] font-bold">{label}</p>
    </div>
  );
}
