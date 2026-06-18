import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Trash2, Archive, Download, Loader2, AlertTriangle, History, Settings2, CheckSquare, Square, X, FileText, Filter } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { downloadCSV } from "@/lib/csv-export";
import { STATUSES, statusBadge, type Rx } from "./shared";
import { TabState, SearchBar, Pagination, PAGE_SIZE, RxCardSkeleton, Skeleton } from "./ui";
import { fetchImageCached, getCachedImage, prefetchImageCached } from "@/lib/image-cache";
import {
  getActivityLog, logActivity, subscribeActivityLog, clearActivityLog,
  actionLabel, type RxActivityEntry,
} from "@/lib/rx-activity-log";

const EST_ROW_HEIGHT = 320;

type Action = (id: string) => Promise<void> | void;
type BulkAction = (ids: string[], onProgress?: (done: number, total: number, currentId: string) => void) => Promise<void> | void;

// ---------- CSV columns ----------
type CsvCol = { key: string; label: string; pick: (r: Rx) => unknown };
const CSV_COLS: CsvCol[] = [
  { key: "id", label: "رقم", pick: (r) => r.id },
  { key: "created_at", label: "تاريخ الإنشاء", pick: (r) => new Date(r.created_at).toLocaleString("ar-EG") },
  { key: "updated_at", label: "آخر تحديث", pick: (r) => new Date(r.updated_at ?? r.created_at).toLocaleString("ar-EG") },
  { key: "customer_name", label: "الاسم", pick: (r) => r.customer_name },
  { key: "customer_phone", label: "الجوال", pick: (r) => r.customer_phone },
  { key: "customer_address", label: "العنوان", pick: (r) => r.customer_address },
  { key: "status", label: "الحالة", pick: (r) => statusBadge(r.status).label },
  { key: "image_urls", label: "الصور", pick: (r) => (r.image_urls ?? []).join(" | ") },
  { key: "image_count", label: "عدد الصور", pick: (r) => (r.image_urls ?? []).length },
  { key: "notes", label: "ملاحظات", pick: (r) => r.notes ?? "" },
];
const CSV_PREF_KEY = "rx-csv-cols-v1";
function loadCsvPrefs(): string[] {
  if (typeof localStorage === "undefined") return CSV_COLS.map((c) => c.key);
  try {
    const raw = localStorage.getItem(CSV_PREF_KEY);
    if (!raw) return CSV_COLS.map((c) => c.key);
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((k) => CSV_COLS.some((c) => c.key === k));
    return valid.length > 0 ? valid : CSV_COLS.map((c) => c.key);
  } catch { return CSV_COLS.map((c) => c.key); }
}

// ---------- Status filter ----------
type StatusFilter = "all" | "active" | "archived" | "cancelled";
const STATUS_FILTERS: { v: StatusFilter; label: string }[] = [
  { v: "all", label: "الكل" },
  { v: "active", label: "نشطة" },
  { v: "archived", label: "مؤرشفة" },
  { v: "cancelled", label: "ملغية" },
];
function matchesStatusFilter(r: Rx, f: StatusFilter): boolean {
  if (f === "all") return true;
  if (f === "archived") return r.status === "archived";
  if (f === "cancelled") return r.status === "cancelled";
  // active = anything that is not archived/cancelled
  return r.status !== "archived" && r.status !== "cancelled";
}

export function PrescriptionsTab({ rxs, onStatus, onDelete, onArchive, onBulkDelete, onBulkArchive, loading, error, onRetry }: {
  rxs: Rx[];
  onStatus: (id: string, s: string) => Promise<void> | void;
  onDelete?: Action;
  onArchive?: Action;
  onBulkDelete?: BulkAction;
  onBulkArchive?: BulkAction;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<null | { kind: "delete" | "archive"; id: string }>(null);
  const [bulkConfirm, setBulkConfirm] = useState<null | { kind: "delete" | "archive" }>(null);
  const [pending, setPending] = useState<Record<string, "status" | "delete" | "archive" | undefined>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showLog, setShowLog] = useState(false);
  const [showCsvSettings, setShowCsvSettings] = useState(false);
  const [csvCols, setCsvCols] = useState<string[]>(() => loadCsvPrefs());
  const [bulkProgress, setBulkProgress] = useState<null | { done: number; total: number; currentId: string; kind: "delete" | "archive" }>(null);
  const [bulkSummary, setBulkSummary] = useState<null | { ok: number; fail: number; total: number; kind: "delete" | "archive"; error?: string }>(null);
  const [exportPreview, setExportPreview] = useState<null | "csv" | "pdf">(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (typeof localStorage === "undefined") return "active";
    return (localStorage.getItem("rx-status-filter-v1") as StatusFilter) || "active";
  });


  // persist CSV pref
  useEffect(() => {
    try { localStorage.setItem(CSV_PREF_KEY, JSON.stringify(csvCols)); } catch { /* quota */ }
  }, [csvCols]);
  useEffect(() => {
    try { localStorage.setItem("rx-status-filter-v1", statusFilter); } catch { /* quota */ }
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rxs.filter((r) => {
      if (!matchesStatusFilter(r, statusFilter)) return false;
      if (!needle) return true;
      return r.id.toLowerCase().includes(needle) ||
        r.customer_name.toLowerCase().includes(needle) ||
        r.customer_phone.includes(needle);
    });
  }, [rxs, q, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (safePage >= pageCount) return;
    const next = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 200);
    idle(() => next.forEach((r) => r.image_urls.forEach(prefetchImageCached)));
  }, [filtered, safePage, pageCount]);

  // Drop selections that no longer exist (e.g. after refresh/delete)
  useEffect(() => {
    setSelected((cur) => {
      const valid = new Set(rxs.map((r) => r.id));
      const next = new Set<string>();
      cur.forEach((id) => { if (valid.has(id)) next.add(id); });
      return next.size === cur.size ? cur : next;
    });
  }, [rxs]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: slice.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => EST_ROW_HEIGHT,
    overscan: 4,
    measureElement: (el) => el.getBoundingClientRect().height,
    getItemKey: (i) => slice[i].id,
  });

  const useVirtual = slice.length > 6;

  const skeleton = (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <RxCardSkeleton key={i} />)}
    </div>
  );

  function exportCSV() {
    const active = csvCols.map((k) => CSV_COLS.find((c) => c.key === k)!).filter(Boolean);
    if (active.length === 0) { toast.error("اختر عموداً واحداً على الأقل للتصدير"); return; }
    const rows = filtered.map((r) => active.map((c) => c.pick(r)));
    downloadCSV(
      `prescriptions-${new Date().toISOString().slice(0, 10)}.csv`,
      active.map((c) => c.label),
      rows,
    );
    toast.success(`تم تصدير ${filtered.length} روشتة (${active.length} عمود)`);
  }

  function exportPDF() {
    const active = csvCols.map((k) => CSV_COLS.find((c) => c.key === k)!).filter(Boolean);
    if (active.length === 0) { toast.error("اختر عموداً واحداً على الأقل للتصدير"); return; }
    if (filtered.length === 0) { toast.error("لا توجد بيانات للتصدير"); return; }
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const filterLabel = STATUS_FILTERS.find((f) => f.v === statusFilter)?.label ?? "الكل";
    const rowsHtml = filtered.map((r) =>
      `<tr>${active.map((c) => `<td>${esc(c.pick(r))}</td>`).join("")}</tr>`
    ).join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير الروشتات</title>
<style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; padding: 0; margin: 0; }
.head { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #0d9488; padding-bottom:10px; margin-bottom:14px; }
.head h1 { margin:0; font-size:18px; color:#0f766e; }
.meta { font-size:11px; color:#475569; }
table { width:100%; border-collapse:collapse; font-size:11px; }
th, td { border:1px solid #cbd5e1; padding:6px 8px; text-align:right; vertical-align:top; }
th { background:#f1f5f9; font-weight:800; color:#0f172a; }
tr:nth-child(even) td { background:#f8fafc; }
.footer { margin-top:14px; font-size:10px; color:#64748b; text-align:center; }
@media print { .no-print { display:none; } }
.no-print { position: fixed; top: 10px; left: 10px; }
.no-print button { background:#0d9488; color:white; border:0; padding:8px 14px; border-radius:8px; font-weight:800; cursor:pointer; }
</style></head><body>
<div class="no-print"><button onclick="window.print()">طباعة / حفظ PDF</button></div>
<div class="head">
  <div><h1>صيدلية المصلي — تقرير الروشتات</h1>
    <div class="meta">الحالة: ${esc(filterLabel)} · البحث: ${esc(q || "—")} · عدد السجلات: ${filtered.length} · تاريخ: ${new Date().toLocaleString("ar-EG")}</div></div>
</div>
<table><thead><tr>${active.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead>
<tbody>${rowsHtml}</tbody></table>
<div class="footer">تم التوليد من لوحة إدارة صيدلية المصلي</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>
</body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) { toast.error("تعذر فتح نافذة الطباعة — تحقق من حاجب النوافذ المنبثقة"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    toast.success(`تم تجهيز PDF لـ ${filtered.length} روشتة`);
  }

  const handleStatus = useCallback(async (id: string, s: string) => {
    const prev = rxs.find((r) => r.id === id)?.status;
    setPending((p) => ({ ...p, [id]: "status" }));
    try {
      await withRetry(() => Promise.resolve(onStatus(id, s)), 2);
      logActivity({ rxId: id, action: "status", status: "success", details: `${prev ?? "?"} ← ${s}` });
    } catch (e: any) {
      logActivity({ rxId: id, action: "status", status: "error", details: `→ ${s}`, error: humanizeError(e, "تحديث الحالة") });
      toast.error(humanizeError(e, "تحديث الحالة"));
    } finally { setPending((p) => ({ ...p, [id]: undefined })); }
  }, [onStatus, rxs]);

  async function runConfirmed() {
    if (!confirm) return;
    const { kind, id } = confirm;
    const handler = kind === "delete" ? onDelete : onArchive;
    if (!handler) return;
    setConfirm(null);
    setPending((p) => ({ ...p, [id]: kind }));
    try {
      await withRetry(() => Promise.resolve(handler(id)), 2);
      logActivity({ rxId: id, action: kind, status: "success" });
      toast.success(kind === "delete" ? `تم حذف الروشتة ${id}` : `تم أرشفة الروشتة ${id}`);
    } catch (e: any) {
      logActivity({ rxId: id, action: kind, status: "error", error: humanizeError(e, kind === "delete" ? "حذف الروشتة" : "أرشفة الروشتة") });
      toast.error(humanizeError(e, kind === "delete" ? "حذف الروشتة" : "أرشفة الروشتة"));
    } finally {
      setPending((p) => ({ ...p, [id]: undefined }));
    }
  }

  async function runBulk() {
    if (!bulkConfirm) return;
    const { kind } = bulkConfirm;
    const handler = kind === "delete" ? onBulkDelete : onBulkArchive;
    const ids = Array.from(selected);
    if (!handler || ids.length === 0) { setBulkConfirm(null); return; }
    setBulkConfirm(null);
    setBulkProgress({ done: 0, total: ids.length, currentId: ids[0], kind });
    let lastDone = 0;
    try {
      await handler(ids, (done, total, currentId) => {
        lastDone = done;
        setBulkProgress({ done, total, currentId, kind });
      });
      logActivity({ rxId: `[${ids.length}]`, action: kind === "delete" ? "bulk-delete" : "bulk-archive", status: "success", details: ids.join(", ") });
      setBulkSummary({ ok: ids.length, fail: 0, total: ids.length, kind });
      setSelected(new Set());
    } catch (e: any) {
      const msg = humanizeError(e, kind === "delete" ? "الحذف الجماعي" : "الأرشفة الجماعية");
      logActivity({ rxId: `[${ids.length}]`, action: kind === "delete" ? "bulk-delete" : "bulk-archive", status: "error", details: ids.join(", "), error: msg });
      setBulkSummary({ ok: lastDone, fail: ids.length - lastDone, total: ids.length, kind, error: msg });
    } finally {
      setBulkProgress(null);
    }
  }

  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((cur) => {
      const allSelected = slice.every((r) => cur.has(r.id));
      const next = new Set(cur);
      if (allSelected) slice.forEach((r) => next.delete(r.id));
      else slice.forEach((r) => next.add(r.id));
      return next;
    });
  }

  const allOnPageSelected = slice.length > 0 && slice.every((r) => selected.has(r.id));

  return (
    <div className="space-y-3" data-testid="prescriptions-tab">
      <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="ابحث برقم الروشتة، الاسم، أو الجوال..." />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
        <Filter className="size-3.5 text-muted-foreground ms-1" />
        <span className="text-[11px] font-bold text-muted-foreground">فلتر الحالة:</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => { setStatusFilter(f.v); setPage(1); }}
            data-testid={`status-filter-${f.v}`}
            className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${statusFilter === f.v ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          عرض {slice.length} من {filtered.length} (الإجمالي {rxs.length})
          {selected.size > 0 && <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 font-black text-primary">محدد: {selected.size}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleAllOnPage}
            disabled={slice.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent disabled:opacity-50"
          >
            {allOnPageSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
            {allOnPageSelected ? "إلغاء تحديد الصفحة" : "تحديد الصفحة"}
          </button>
          {selected.size > 0 && onBulkArchive && (
            <button onClick={() => setBulkConfirm({ kind: "archive" })} className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700">
              <Archive className="size-3.5" /> أرشفة ({selected.size})
            </button>
          )}
          {selected.size > 0 && onBulkDelete && (
            <button onClick={() => setBulkConfirm({ kind: "delete" })} className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600">
              <Trash2 className="size-3.5" /> حذف ({selected.size})
            </button>
          )}
          <button onClick={() => setShowLog(true)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent" title="سجل النشاط">
            <History className="size-3.5" /> سجل النشاط
          </button>
          <button onClick={() => setShowCsvSettings(true)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent" title="إعدادات التصدير">
            <Settings2 className="size-3.5" />
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            data-testid="export-csv-btn"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <Download className="size-3.5" /> CSV ({filtered.length})
          </button>
          <button
            onClick={exportPDF}
            disabled={filtered.length === 0}
            data-testid="export-pdf-btn"
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <FileText className="size-3.5" /> PDF ({filtered.length})
          </button>
        </div>
      </div>


      <TabState loading={loading} error={error} empty={filtered.length === 0} onRetry={onRetry} skeleton={skeleton}>
        {useVirtual ? (
          <div ref={parentRef} className="max-h-[75vh] overflow-auto rounded-xl" style={{ contain: "strict" }} data-testid="rx-virtual-list">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const r = slice[vi.index];
                return (
                  <div
                    key={r.id}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)`, paddingBottom: 12 }}
                  >
                    <RxCard
                      rx={r}
                      pending={pending[r.id]}
                      selected={selected.has(r.id)}
                      onToggleSelect={toggleOne}
                      onStatus={handleStatus}
                      onDelete={onDelete ? (id) => setConfirm({ kind: "delete", id }) : undefined}
                      onArchive={onArchive ? (id) => setConfirm({ kind: "archive", id }) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="rx-flat-list">
            {slice.map((r) => (
              <RxCard
                key={r.id}
                rx={r}
                pending={pending[r.id]}
                selected={selected.has(r.id)}
                onToggleSelect={toggleOne}
                onStatus={handleStatus}
                onDelete={onDelete ? (id) => setConfirm({ kind: "delete", id }) : undefined}
                onArchive={onArchive ? (id) => setConfirm({ kind: "archive", id }) : undefined}
              />
            ))}
          </div>
        )}
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
      </TabState>

      {confirm && (
        <ConfirmDialog
          kind={confirm.kind}
          rxId={confirm.id}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirmed}
        />
      )}

      {bulkConfirm && (
        <ConfirmDialog
          kind={bulkConfirm.kind}
          rxId={`${selected.size} روشتة`}
          bulk
          onCancel={() => setBulkConfirm(null)}
          onConfirm={runBulk}
        />
      )}

      {bulkProgress && <BulkProgressOverlay p={bulkProgress} />}
      {bulkSummary && <BulkSummaryDialog s={bulkSummary} onClose={() => setBulkSummary(null)} />}

      {showLog && <ActivityLogDialog onClose={() => setShowLog(false)} />}
      {showCsvSettings && (
        <CsvSettingsDialog
          selected={csvCols}
          onChange={setCsvCols}
          onClose={() => setShowCsvSettings(false)}
        />
      )}
    </div>
  );
}

// ---------- Confirm dialog ----------
function ConfirmDialog({ kind, rxId, bulk, onConfirm, onCancel }: {
  kind: "delete" | "archive"; rxId: string; bulk?: boolean;
  onConfirm: () => Promise<void> | void; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const isDelete = kind === "delete";
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-in fade-in" onClick={() => !busy && onCancel()}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elevated">
        <div className="flex items-start gap-3">
          <div className={`grid size-10 place-items-center rounded-xl ${isDelete ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
            {isDelete ? <Trash2 className="size-5" /> : <Archive className="size-5" />}
          </div>
          <div className="flex-1">
            <p className="text-base font-black">
              {bulk
                ? (isDelete ? "تأكيد حذف جماعي" : "تأكيد أرشفة جماعية")
                : (isDelete ? "تأكيد حذف الروشتة" : "تأكيد أرشفة الروشتة")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDelete
                ? `سيتم حذف ${rxId} نهائياً ولا يمكن التراجع. هل تريد المتابعة؟`
                : `سيتم نقل ${rxId} إلى الأرشيف وإخفاؤها من القائمة الافتراضية.`}
            </p>
            {isDelete && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                <span>عملية الحذف نهائية — يفضّل الأرشفة بدلاً من الحذف.</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent disabled:opacity-50">إلغاء</button>
          <button
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            disabled={busy}
            data-testid="confirm-btn"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black text-white disabled:opacity-60 ${isDelete ? "bg-rose-500 hover:bg-rose-600" : "bg-slate-600 hover:bg-slate-700"}`}
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {isDelete ? (bulk ? "حذف الكل" : "حذف نهائي") : (bulk ? "أرشفة الكل" : "أرشفة")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Bulk progress ----------
function BulkProgressOverlay({ p }: { p: { done: number; total: number; currentId: string; kind: "delete" | "archive" } }) {
  const pct = Math.round((p.done / Math.max(1, p.total)) * 100);
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl bg-card p-4 shadow-elevated border border-border animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between text-xs font-black">
        <span>{p.kind === "delete" ? "جارٍ الحذف الجماعي" : "جارٍ الأرشفة الجماعية"} — {p.done}/{p.total}</span>
        <span className="text-primary">{pct}%</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">قيد المعالجة: {p.currentId}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/15">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------- CSV settings ----------
function CsvSettingsDialog({ selected, onChange, onClose }: {
  selected: string[]; onChange: (next: string[]) => void; onClose: () => void;
}) {
  function toggle(k: string) {
    if (selected.includes(k)) onChange(selected.filter((x) => x !== k));
    else onChange([...selected, k]);
  }
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elevated">
        <div className="flex items-center justify-between">
          <p className="text-base font-black">أعمدة التصدير</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">اختر الأعمدة المطلوبة — يتم حفظ التحديد تلقائياً لاستخدامه في المرات القادمة.</p>
        <div className="mt-3 grid gap-2">
          {CSV_COLS.map((c) => {
            const checked = selected.includes(c.key);
            return (
              <label key={c.key} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
                <span className="font-bold">{c.label}</span>
                <input type="checkbox" checked={checked} onChange={() => toggle(c.key)} className="size-4 accent-primary" />
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => onChange(CSV_COLS.map((c) => c.key))}
            className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"
          >تحديد الكل</button>
          <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:bg-primary-deep">تم</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Bulk summary dialog ----------
function BulkSummaryDialog({ s, onClose }: {
  s: { ok: number; fail: number; total: number; kind: "delete" | "archive"; error?: string };
  onClose: () => void;
}) {
  const okPct = Math.round((s.ok / Math.max(1, s.total)) * 100);
  const allOk = s.fail === 0;
  const verb = s.kind === "delete" ? "الحذف" : "الأرشفة";
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-in fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} data-testid="bulk-summary" className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elevated">
        <div className="flex items-start gap-3">
          <div className={`grid size-10 place-items-center rounded-xl ${allOk ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}>
            {allOk ? <CheckSquare className="size-5" /> : <AlertTriangle className="size-5" />}
          </div>
          <div className="flex-1">
            <p className="text-base font-black">{allOk ? `اكتمل ${verb} بنجاح` : `اكتمل ${verb} مع وجود أخطاء`}</p>
            <p className="mt-1 text-xs text-muted-foreground">إجمالي العمليات: {s.total}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">{s.ok}</p>
            <p className="text-[11px] font-bold text-emerald-700">نجاح</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3 text-center">
            <p className="text-2xl font-black text-rose-700">{s.fail}</p>
            <p className="text-[11px] font-bold text-rose-700">فشل</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${okPct}%` }} />
        </div>
        {s.error && (
          <p className="mt-3 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{s.error}</p>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:bg-primary-deep">تم</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Activity log dialog ----------
function ActivityLogDialog({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<RxActivityEntry[]>(() => getActivityLog());
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => subscribeActivityLog(setEntries), []);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl bg-card p-5 shadow-elevated">
        <div className="flex items-center justify-between">
          <p className="text-base font-black flex items-center gap-2"><History className="size-4" /> سجل نشاط الروشتات</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmClear(true)}
              disabled={entries.length === 0}
              data-testid="clear-log-btn"
              className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> تصفير السجل
            </button>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">السجل محفوظ محلياً على هذا المتصفح ويبقى عند إعادة تحميل الصفحة. آخر {entries.length} عملية.</p>
        <div className="mt-3 max-h-[60vh] overflow-auto rounded-xl border border-border">
          {entries.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">لا يوجد نشاط بعد</p>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-secondary text-[11px] font-black">
                <tr>
                  <th className="px-3 py-2">الوقت</th>
                  <th className="px-3 py-2">الإجراء</th>
                  <th className="px-3 py-2">الروشتة</th>
                  <th className="px-3 py-2">التفاصيل / السبب</th>
                  <th className="px-3 py-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{new Date(e.at).toLocaleString("ar-EG")}</td>
                    <td className="px-3 py-2 font-bold">{actionLabel(e.action)}</td>
                    <td className="px-3 py-2" dir="ltr">{e.rxId}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.error || e.details || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${e.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {e.status === "success" ? "نجاح" : "فشل"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirmClear && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={() => setConfirmClear(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-600"><Trash2 className="size-5" /></div>
              <div>
                <p className="text-base font-black">تأكيد تصفير سجل النشاط</p>
                <p className="mt-1 text-xs text-muted-foreground">سيتم حذف كافة سجلات النشاط المخزنة محلياً ({entries.length} عملية) ولا يمكن استرجاعها. تأثير الحذف على بيانات الروشتات الفعلية: لا يوجد.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">إلغاء</button>
              <button
                data-testid="confirm-clear-log"
                onClick={() => { clearActivityLog(); setConfirmClear(false); toast.success("تم تصفير سجل النشاط"); }}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600"
              >
                <Trash2 className="size-3.5" /> تصفير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ---------- Cached image tile ----------
function CachedImage({ url, alt, onClick, onPrefetch }: {
  url: string; alt: string; onClick?: () => void; onPrefetch?: () => void;
}) {
  const [src, setSrc] = useState<string | undefined>(() => getCachedImage(url));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const hit = getCachedImage(url);
    if (hit) { setSrc(hit); setFailed(false); return; }
    setSrc(undefined); setFailed(false);
    fetchImageCached(url)
      .then((u) => { if (alive) setSrc(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [url]);

  return (
    <button type="button" onClick={onClick} onMouseEnter={onPrefetch} onFocus={onPrefetch}
      className="relative block aspect-square overflow-hidden rounded-lg border border-border">
      {!src && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
      {failed && <div className="absolute inset-0 grid place-items-center bg-rose-50 text-[10px] font-bold text-rose-600">تعذر التحميل</div>}
      {src && <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover transition hover:scale-105" />}
    </button>
  );
}

// ---------- Row ----------
function RxCard({ rx, pending, selected, onToggleSelect, onStatus, onDelete, onArchive }: {
  rx: Rx;
  pending?: "status" | "delete" | "archive";
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onStatus: (id: string, s: string) => Promise<void> | void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}) {
  const b = statusBadge(rx.status);
  const [zoom, setZoom] = useState<string | null>(null);
  const prefetch = useCallback((u: string) => prefetchImageCached(u), []);
  const busy = !!pending;

  return (
    <div data-testid={`rx-card-${rx.id}`} className={`relative rounded-2xl border bg-card p-4 shadow-card transition ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${busy ? "opacity-70" : ""}`}>
      {busy && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
          <Loader2 className="size-3 animate-spin" />
          {pending === "delete" ? "جارٍ الحذف..." : pending === "archive" ? "جارٍ الأرشفة..." : "جارٍ التحديث..."}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <label className="mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(rx.id)}
              aria-label={`تحديد الروشتة ${rx.id}`}
              data-testid={`select-${rx.id}`}
              className="size-4 accent-primary"
            />
          </label>
          <div>
            <p className="text-base font-black text-primary-deep">{rx.id}</p>
            <p className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleString("ar-EG")}</p>
            <p className="mt-1 text-sm font-bold">{rx.customer_name} · <span dir="ltr" className="text-muted-foreground">{rx.customer_phone}</span></p>
            <p className="text-xs text-muted-foreground">📍 {rx.customer_address}</p>
            {rx.notes && <p className="mt-1 text-xs">📝 {rx.notes}</p>}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
      </div>

      {rx.image_urls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rx.image_urls.map((u, i) => (
            <CachedImage key={u} url={u} alt={`روشتة ${i + 1}`}
              onClick={() => { prefetch(u); setZoom(u); }}
              onPrefetch={() => prefetch(u)} />
          ))}
        </div>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 animate-in fade-in">
          <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(null); }} aria-label="إغلاق"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">✕</button>
          <img src={getCachedImage(zoom) ?? zoom} alt="عرض الروشتة بالحجم الكامل" onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-elevated" />
          <a href={zoom} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-foreground hover:bg-white">فتح الصورة الأصلية</a>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={rx.status} disabled={busy} onChange={(e) => onStatus(rx.id, e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold disabled:opacity-50">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button disabled={busy}
          onClick={() => openWhatsApp(buildStatusMessage({ name: rx.customer_name, orderId: rx.id, status: "confirmed" }), rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
          <MessageCircle className="size-3.5" /> إشعار: جاهز
        </button>
        <button disabled={busy}
          onClick={() => openWhatsApp(`مرحبًا ${rx.customer_name}، بخصوص روشتتك ${rx.id} من صيدلية المصلي:`, rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
          <MessageCircle className="size-3.5" /> واتساب العميل
        </button>

        <div className="ml-auto flex items-center gap-2">
          {onArchive && rx.status !== "archived" && (
            <button disabled={busy} onClick={() => onArchive(rx.id)}
              data-testid={`archive-${rx.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-300 disabled:opacity-50">
              <Archive className="size-3.5" /> أرشفة
            </button>
          )}
          {onDelete && (
            <button disabled={busy} onClick={() => onDelete(rx.id)}
              data-testid={`delete-${rx.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600 disabled:opacity-50">
              <Trash2 className="size-3.5" /> حذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------
async function withRetry<T>(fn: () => Promise<T>, max = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= max; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < max) await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function humanizeError(e: any, action: string): string {
  const raw = String(e?.message ?? e ?? "");
  if (/network|fetch|Failed to fetch/i.test(raw)) return `فشل ${action}: انقطع الاتصال بالشبكة. تحقق من الإنترنت وحاول مجدداً.`;
  if (/permission|denied|RLS|row-level/i.test(raw)) return `فشل ${action}: لا تملك صلاحية كافية لهذه العملية.`;
  if (/timeout/i.test(raw)) return `فشل ${action}: انتهت مهلة الاستجابة من الخادم.`;
  if (raw) return `فشل ${action}: ${raw}`;
  return `فشل ${action}، حاول مرة أخرى.`;
}
