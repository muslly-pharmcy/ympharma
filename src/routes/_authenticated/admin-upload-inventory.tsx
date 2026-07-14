import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "@e965/xlsx";
import { AdminGate } from "@/components/admin/AdminGate";
import {
  runInventorySync,
  finalizeInventoryHide,
  getProductCounts,
  recordSyncRun,
  type SyncReport,
} from "@/lib/inventory-sync.functions";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin-upload-inventory")({
  component: () => (
    <AdminGate>
      <UploadPage />
    </AdminGate>
  ),
});

type Status = "idle" | "parsing" | "validated" | "syncing" | "done" | "error" | "cancelled";

type ParsedRow = {
  legacyId: number;
  name: string;
  supplier: string | null;
  expiry: string | null;
  stock: number;
  price: number;
  category: string | null;
};
type RowError = { rowNumber: number; legacyIdRaw: string; field: string; message: string };
type Counts = { total: number; published: number; withStock: number };

const CHUNK_SIZE = 300;

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function toNumber(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function toIsoDate(s: string): { value: string | null; error?: string } {
  if (!s) return { value: null };
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum > 10000 && asNum < 80000) {
    const d = XLSX.SSF.parse_date_code(asNum);
    if (d) return { value: `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` };
  }
  const m = s.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (!m) return { value: null, error: `تاريخ غير صالح: "${s}"` };
  const [, a, b, c] = m;
  let iso: string;
  if (a.length === 4) iso = `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  else {
    const yyyy = c.length === 2 ? `20${c}` : c;
    iso = `${yyyy}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { value: null, error: `تاريخ غير صالح: "${s}"` };
  return { value: iso };
}

function UploadPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<SyncReport | null>(null);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [countsBefore, setCountsBefore] = useState<Counts | null>(null);
  const [countsAfter, setCountsAfter] = useState<Counts | null>(null);
  const cancelledRef = useRef(false);

  const sync = useServerFn(runInventorySync);
  const finalize = useServerFn(finalizeInventoryHide);
  const fetchCounts = useServerFn(getProductCounts);
  const recordRun = useServerFn(recordSyncRun);

  useEffect(() => {
    fetchCounts({} as never).then(setCountsBefore).catch(() => {});
  }, [fetchCounts]);

  function log(msg: string) {
    setLiveLog((l) => [...l.slice(-50), `${new Date().toLocaleTimeString("ar")} • ${msg}`]);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null); setReport(null); setRows([]); setRowErrors([]); setLiveLog([]); setCountsAfter(null);
    setStatus("parsing");
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const valid: ParsedRow[] = [];
      const errs: RowError[] = [];
      json.forEach((r, i) => {
        const rowNumber = i + 2;
        const legacyStr = pick(r, ["الكـود", "الكود", "Code", "code"]);
        const legacyId = parseInt(legacyStr.replace(/\D/g, ""), 10);
        if (!legacyId || legacyId <= 0) {
          errs.push({ rowNumber, legacyIdRaw: legacyStr, field: "legacy_id", message: "كود المنتج فارغ أو غير صالح" });
          return;
        }
        const name = pick(r, ["اســم الصـــنف", "اسم الصنف", "Name", "name"]);
        if (!name) {
          errs.push({ rowNumber, legacyIdRaw: legacyStr, field: "name", message: "اسم الصنف فارغ" });
          return;
        }
        const expiryRaw = pick(r, ["تاريخ الإنتهاء", "تاريخ الانتهاء", "Expiry"]);
        const exp = toIsoDate(expiryRaw);
        if (exp.error) errs.push({ rowNumber, legacyIdRaw: legacyStr, field: "expiry_date", message: exp.error });
        const stock = Math.floor(toNumber(pick(r, ["الرصيــــد", "الرصيد", "Stock", "Qty"])));
        if (stock < 0) { errs.push({ rowNumber, legacyIdRaw: legacyStr, field: "stock_qty", message: "الرصيد سالب" }); return; }
        const price = toNumber(pick(r, ["السعر", "القيمــــــة", "القيمة", "Price"]));
        if (price < 0) { errs.push({ rowNumber, legacyIdRaw: legacyStr, field: "price", message: "السعر سالب" }); return; }
        valid.push({
          legacyId, name,
          supplier: pick(r, ["المــــــــورد", "المورد", "Supplier"]) || null,
          expiry: exp.value, stock, price,
          category: pick(r, ["التصنيف", "Category"]) || null,
        });
      });
      if (valid.length === 0) throw new Error("لا توجد صفوف صالحة في الملف.");
      setRows(valid);
      setRowErrors(errs);
      setStatus("validated");
      log(`تم التحقق: ${valid.length} صف صالح، ${errs.length} خطأ.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      e.target.value = "";
    }
  }

  async function startSync() {
    cancelledRef.current = false;
    setStatus("syncing");
    setProgress({ done: 0, total: rows.length });
    const startedAt = new Date().toISOString();
    const agg: SyncReport = {
      total: rows.length, updated: 0, inserted: 0, republished: 0, hidden: 0,
      errors: [], updatedIds: [], insertedIds: [], hiddenIds: [],
    };
    const seenLegacyIds: number[] = [];
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        if (cancelledRef.current) throw new Error("__CANCELLED__");
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        log(`مزامنة ${i + 1}–${i + chunk.length} من ${rows.length}…`);
        const res = await sync({ data: { rows: chunk, skipHide: true, logActivity: false } });
        agg.updated += res.updated;
        agg.inserted += res.inserted;
        agg.republished += res.republished;
        agg.errors.push(...res.errors);
        if (res.updatedIds) agg.updatedIds!.push(...res.updatedIds);
        if (res.insertedIds) agg.insertedIds!.push(...res.insertedIds);
        for (const r of chunk) seenLegacyIds.push(r.legacyId);
        setProgress({ done: Math.min(i + chunk.length, rows.length), total: rows.length });
      }
      if (cancelledRef.current) throw new Error("__CANCELLED__");
      log("إخفاء المنتجات غير الموجودة…");
      const fin = await finalize({
        data: {
          seenLegacyIds,
          aggregateReport: {
            total: agg.total, updated: agg.updated, inserted: agg.inserted,
            republished: agg.republished, errorCount: agg.errors.length,
          },
        },
      });
      agg.hidden = fin.hidden;
      if (fin.hiddenIds) agg.hiddenIds = fin.hiddenIds;
      setReport(agg);

      // Persist run + notify on error
      const after = await fetchCounts({} as never);
      setCountsAfter(after);
      await recordRun({
        data: {
          status: agg.errors.length > 0 ? "failed" : "completed",
          total: agg.total, updated: agg.updated, inserted: agg.inserted,
          republished: agg.republished, hidden: agg.hidden,
          errors: agg.errors.slice(0, 100).map((e) => `#${e.legacyId}: ${e.message}`),
          failureReason: agg.errors.length > 0 ? `${agg.errors.length} خطأ أثناء المزامنة` : undefined,
          metadata: {
            excelCount: rows.length,
            countsBefore, countsAfter: after,
            updatedIds: agg.updatedIds?.slice(0, 500),
            insertedIds: agg.insertedIds?.slice(0, 500),
            hiddenIds: agg.hiddenIds?.slice(0, 500),
          },
          startedAt,
        },
      });

      setStatus("done");
      log(`اكتملت المزامنة. مُحدّث ${agg.updated} • مُضاف ${agg.inserted} • مُخفي ${agg.hidden}.`);
    } catch (err) {
      const isCancel = err instanceof Error && err.message === "__CANCELLED__";
      const after = await fetchCounts({} as never).catch(() => null);
      if (after) setCountsAfter(after);
      try {
        await recordRun({
          data: {
            status: isCancel ? "cancelled" : "failed",
            total: agg.total, updated: agg.updated, inserted: agg.inserted,
            republished: agg.republished, hidden: agg.hidden,
            errors: agg.errors.slice(0, 100).map((e) => `#${e.legacyId}: ${e.message}`),
            failureReason: isCancel
              ? "تم الإلغاء من واجهة الإدارة"
              : (err instanceof Error ? err.message : String(err)),
            metadata: { excelCount: rows.length, countsBefore, countsAfter: after },
            startedAt,
          },
        });
      } catch { /* ignore */ }
      if (isCancel) {
        setStatus("cancelled");
        setReport(agg);
        log("تم إلغاء المزامنة.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }
  }

  function cancelSync() {
    cancelledRef.current = true;
    log("⏹️ طلب إلغاء — سيتوقف بعد انتهاء الدفعة الحالية…");
  }

  function downloadReport() {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const summary: (string | number)[][] = [
      ["الإجمالي", report.total],
      ["مُحدّث", report.updated],
      ["مُضاف", report.inserted],
      ["أُعيد نشره", report.republished],
      ["مُخفي", report.hidden],
      ["أخطاء", report.errors.length],
    ];
    const errorRows: (string | number)[][] = report.errors.map((e) => ["", "", "", e.legacyId, e.message]);
    downloadCSV(
      `inventory-sync-${stamp}.csv`,
      ["البند", "العدد", "—", "كود المنتج", "رسالة الخطأ"],
      [...summary.map((r) => [r[0], r[1], "", "", ""]), ...errorRows],
    );
  }

  function downloadValidationErrors() {
    if (rowErrors.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCSV(
      `inventory-validation-errors-${stamp}.csv`,
      ["رقم الصف", "الكود", "الحقل", "الخطأ"],
      rowErrors.map((e) => [e.rowNumber, e.legacyIdRaw, e.field, e.message]),
    );
  }

  const pct = useMemo(() => (progress.total ? Math.round((progress.done / progress.total) * 100) : 0), [progress]);
  const busy = status === "parsing" || status === "syncing";

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">📤 رفع ومزامنة المخزون من إكسيل</h1>
            <p className="text-sm text-muted-foreground">
              تحقّق + تقدم لحظي + مقارنة count قبل/بعد + زر إلغاء.
            </p>
          </div>
          <a href="/admin-inventory-sync-logs" className="text-xs underline text-primary">سجل المزامنة →</a>
        </header>

        {countsBefore && (
          <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <CountBox label="المنتجات في القاعدة" value={countsBefore.total} />
            <CountBox label="منشور" value={countsBefore.published} />
            <CountBox label="مع رصيد > 0" value={countsBefore.withStock} />
            <CountBox label="صفوف إكسيل" value={rows.length || 0} tone="info" />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold">اختر الملف (.xls / .xlsx)</span>
            <input
              type="file" accept=".xls,.xlsx" onChange={handleFile} disabled={busy}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:font-bold disabled:opacity-50"
            />
          </label>

          {status === "parsing" && <p className="text-sm">⏳ جاري قراءة وفحص الملف…</p>}

          {status === "validated" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                ✅ صفوف صالحة: <b>{rows.length}</b>
                {rowErrors.length > 0 && <> — ⚠️ صفوف بأخطاء: <b>{rowErrors.length}</b></>}
              </div>
              {rowErrors.length > 0 && (
                <details className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <summary className="cursor-pointer font-bold">عرض أخطاء التحقق ({rowErrors.length})</summary>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={downloadValidationErrors} className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted">
                      تنزيل أخطاء التحقق (CSV)
                    </button>
                  </div>
                  <ul className="mt-2 max-h-60 overflow-auto space-y-1">
                    {rowErrors.slice(0, 200).map((e, i) => (
                      <li key={i}>صف {e.rowNumber} • كود "{e.legacyIdRaw || "—"}" • {e.field}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
              <button onClick={startSync} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                🚀 ابدأ المزامنة ({rows.length} صف)
              </button>
            </div>
          )}

          {status === "syncing" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>🔄 جارٍ المزامنة…</span>
                <span className="tabular-nums">{progress.done.toLocaleString("ar")} / {progress.total.toLocaleString("ar")} ({pct}%)</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <button
                onClick={cancelSync}
                disabled={cancelledRef.current}
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {cancelledRef.current ? "⏳ جاري الإلغاء…" : "⏹️ إلغاء المزامنة"}
              </button>
            </div>
          )}

          {(status === "syncing" || status === "done" || status === "cancelled") && liveLog.length > 0 && (
            <details open className="rounded-xl border border-border bg-background/50 p-3 text-xs">
              <summary className="cursor-pointer font-bold">السجل اللحظي</summary>
              <ul className="mt-2 max-h-48 overflow-auto space-y-1 font-mono">
                {liveLog.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </details>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              ❌ {error}
            </div>
          )}

          {status === "cancelled" && report && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              ⏹️ تم إلغاء المزامنة. تم تحديث {report.updated} وإضافة {report.inserted} قبل الإلغاء.
            </div>
          )}

          {status === "done" && report && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
              <p className="font-bold text-emerald-700 dark:text-emerald-400">✅ تمت المزامنة بنجاح</p>
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <li>📊 الإجمالي: <b>{report.total}</b></li>
                <li>♻️ مُحدّث: <b>{report.updated}</b></li>
                <li>🆕 مُضاف: <b>{report.inserted}</b></li>
                <li>📢 أُعيد نشره: <b>{report.republished}</b></li>
                <li>🙈 مُخفي: <b>{report.hidden}</b></li>
                <li>⚠️ أخطاء: <b>{report.errors.length}</b></li>
              </ul>
              {countsAfter && countsBefore && (
                <div className="rounded-lg border border-border bg-background p-3 text-xs">
                  <p className="font-bold mb-1">📐 تقرير التطابق:</p>
                  <ul className="grid grid-cols-3 gap-2 tabular-nums">
                    <li>إكسيل: <b>{rows.length}</b></li>
                    <li>قاعدة (قبل): <b>{countsBefore.total}</b></li>
                    <li>قاعدة (بعد): <b>{countsAfter.total}</b></li>
                    <li>منشور (قبل): <b>{countsBefore.published}</b></li>
                    <li>منشور (بعد): <b>{countsAfter.published}</b></li>
                    <li className={countsAfter.published === rows.length ? "text-emerald-600 font-bold" : "text-amber-600"}>
                      فرق: <b>{countsAfter.published - rows.length}</b>
                    </li>
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={downloadReport} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                  📥 تنزيل تقرير CSV
                </button>
                <a href="/admin-inventory-sync-logs" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted">
                  📜 عرض السجل
                </a>
              </div>
              {report.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold">عرض الأخطاء ({report.errors.length})</summary>
                  <ul className="mt-2 max-h-60 overflow-auto space-y-1">
                    {report.errors.slice(0, 100).map((e, i) => (
                      <li key={i} className="text-destructive">#{e.legacyId}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
          <p className="font-bold mb-1">الأعمدة المتوقعة:</p>
          <p>الكـود، اســم الصـــنف، المــــــــورد، تاريخ الإنتهاء، الرصيــــد، السعر/القيمة.</p>
          <p className="mt-1">يتم التحقق محليًا، ثم مزامنة الصفوف على دفعات من {CHUNK_SIZE} مع شريط تقدم وزر إلغاء.</p>
        </div>
      </div>
    </div>
  );
}

function CountBox({ label, value, tone }: { label: string; value: number; tone?: "info" }) {
  return (
    <div className={`rounded-lg border p-2 ${tone === "info" ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-base font-black tabular-nums">{value.toLocaleString("ar")}</div>
    </div>
  );
}
