import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Trash2, Archive, Download, Loader2, AlertTriangle } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { downloadCSV } from "@/lib/csv-export";
import { STATUSES, statusBadge, type Rx } from "./shared";
import { TabState, SearchBar, Pagination, PAGE_SIZE, RxCardSkeleton, Skeleton } from "./ui";
import { fetchImageCached, getCachedImage, prefetchImageCached } from "@/lib/image-cache";

// Stable estimated row height — used by the virtualizer before measurement.
// Cards have a fixed text header + a 4×aspect-square image strip whose
// aspect ratio is locked, so the measurable height is deterministic.
const EST_ROW_HEIGHT = 320;

type Action = (id: string) => Promise<void> | void;

export function PrescriptionsTab({ rxs, onStatus, onDelete, onArchive, loading, error, onRetry }: {
  rxs: Rx[];
  onStatus: (id: string, s: string) => Promise<void> | void;
  onDelete?: Action;
  onArchive?: Action;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<null | { kind: "delete" | "archive"; id: string }>(null);
  const [pending, setPending] = useState<Record<string, "status" | "delete" | "archive" | undefined>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rxs;
    return rxs.filter((r) =>
      r.id.toLowerCase().includes(needle) ||
      r.customer_name.toLowerCase().includes(needle) ||
      r.customer_phone.includes(needle)
    );
  }, [rxs, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Prefetch next-page images during idle time.
  useEffect(() => {
    if (safePage >= pageCount) return;
    const next = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 200);
    idle(() => next.forEach((r) => r.image_urls.forEach(prefetchImageCached)));
  }, [filtered, safePage, pageCount]);

  // --- Virtualization (fixed estimate + measureElement to avoid jumps) ---
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
    const rows = filtered.map((r) => [
      r.id, new Date(r.created_at).toLocaleString("ar-EG"),
      r.customer_name, r.customer_phone, r.customer_address,
      r.status, (r.image_urls ?? []).join(" | "), r.notes ?? "",
    ]);
    downloadCSV(
      `prescriptions-${new Date().toISOString().slice(0, 10)}.csv`,
      ["رقم", "التاريخ", "الاسم", "الجوال", "العنوان", "الحالة", "الصور", "ملاحظات"],
      rows,
    );
    toast.success(`تم تصدير ${filtered.length} روشتة`);
  }

  const handleStatus = useCallback(async (id: string, s: string) => {
    setPending((p) => ({ ...p, [id]: "status" }));
    try { await withRetry(() => Promise.resolve(onStatus(id, s)), 2); }
    catch (e: any) { toast.error(humanizeError(e, "تحديث الحالة")); }
    finally { setPending((p) => ({ ...p, [id]: undefined })); }
  }, [onStatus]);

  async function runConfirmed() {
    if (!confirm) return;
    const { kind, id } = confirm;
    const handler = kind === "delete" ? onDelete : onArchive;
    if (!handler) return;
    setConfirm(null);
    setPending((p) => ({ ...p, [id]: kind }));
    try {
      await withRetry(() => Promise.resolve(handler(id)), 2);
      toast.success(kind === "delete" ? `تم حذف الروشتة ${id}` : `تم أرشفة الروشتة ${id}`);
    } catch (e: any) {
      toast.error(humanizeError(e, kind === "delete" ? "حذف الروشتة" : "أرشفة الروشتة"));
    } finally {
      setPending((p) => ({ ...p, [id]: undefined }));
    }
  }

  return (
    <div className="space-y-3">
      <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="ابحث برقم الروشتة، الاسم، أو الجوال..." />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          عرض {slice.length} من {filtered.length} (الإجمالي {rxs.length})
        </p>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          <Download className="size-3.5" /> تصدير CSV ({filtered.length})
        </button>
      </div>

      <TabState loading={loading} error={error} empty={filtered.length === 0} onRetry={onRetry} skeleton={skeleton}>
        {useVirtual ? (
          <div ref={parentRef} className="max-h-[75vh] overflow-auto rounded-xl" style={{ contain: "strict" }}>
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
          <div className="space-y-3">
            {slice.map((r) => (
              <RxCard
                key={r.id}
                rx={r}
                pending={pending[r.id]}
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
    </div>
  );
}

// ---------- Confirm dialog ----------
function ConfirmDialog({ kind, rxId, onConfirm, onCancel }: {
  kind: "delete" | "archive"; rxId: string;
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
              {isDelete ? "تأكيد حذف الروشتة" : "تأكيد أرشفة الروشتة"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDelete
                ? `سيتم حذف الروشتة ${rxId} نهائياً ولا يمكن التراجع. هل تريد المتابعة؟`
                : `سيتم نقل الروشتة ${rxId} إلى الأرشيف وإخفاؤها من القائمة الافتراضية.`}
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
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black text-white disabled:opacity-60 ${isDelete ? "bg-rose-500 hover:bg-rose-600" : "bg-slate-600 hover:bg-slate-700"}`}
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {isDelete ? "حذف نهائي" : "أرشفة"}
          </button>
        </div>
      </div>
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
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="relative block aspect-square overflow-hidden rounded-lg border border-border"
    >
      {!src && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
      {failed && <div className="absolute inset-0 grid place-items-center bg-rose-50 text-[10px] font-bold text-rose-600">تعذر التحميل</div>}
      {src && (
        <img src={src} alt={alt} loading="lazy" decoding="async"
          className="size-full object-cover transition hover:scale-105" />
      )}
    </button>
  );
}

// ---------- Row ----------
function RxCard({ rx, pending, onStatus, onDelete, onArchive }: {
  rx: Rx;
  pending?: "status" | "delete" | "archive";
  onStatus: (id: string, s: string) => Promise<void> | void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}) {
  const b = statusBadge(rx.status);
  const [zoom, setZoom] = useState<string | null>(null);
  const prefetch = useCallback((u: string) => prefetchImageCached(u), []);
  const busy = !!pending;

  return (
    <div className={`relative rounded-2xl border border-border bg-card p-4 shadow-card transition ${busy ? "opacity-70" : ""}`}>
      {busy && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
          <Loader2 className="size-3 animate-spin" />
          {pending === "delete" ? "جارٍ الحذف..." : pending === "archive" ? "جارٍ الأرشفة..." : "جارٍ التحديث..."}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-primary-deep">{rx.id}</p>
          <p className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleString("ar-EG")}</p>
          <p className="mt-1 text-sm font-bold">{rx.customer_name} · <span dir="ltr" className="text-muted-foreground">{rx.customer_phone}</span></p>
          <p className="text-xs text-muted-foreground">📍 {rx.customer_address}</p>
          {rx.notes && <p className="mt-1 text-xs">📝 {rx.notes}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
      </div>

      {rx.image_urls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rx.image_urls.map((u, i) => (
            <CachedImage
              key={u}
              url={u}
              alt={`روشتة ${i + 1}`}
              onClick={() => { prefetch(u); setZoom(u); }}
              onPrefetch={() => prefetch(u)}
            />
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
        <select
          value={rx.status}
          disabled={busy}
          onChange={(e) => onStatus(rx.id, e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button
          disabled={busy}
          onClick={() => openWhatsApp(buildStatusMessage({ name: rx.customer_name, orderId: rx.id, status: "confirmed" }), rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
        ><MessageCircle className="size-3.5" /> إشعار: جاهز</button>
        <button
          disabled={busy}
          onClick={() => openWhatsApp(`مرحبًا ${rx.customer_name}، بخصوص روشتتك ${rx.id} من صيدلية المصلي:`, rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
        ><MessageCircle className="size-3.5" /> واتساب العميل</button>

        <div className="ml-auto flex items-center gap-2">
          {onArchive && rx.status !== "archived" && (
            <button
              disabled={busy}
              onClick={() => onArchive(rx.id)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-300 disabled:opacity-50"
            ><Archive className="size-3.5" /> أرشفة</button>
          )}
          {onDelete && (
            <button
              disabled={busy}
              onClick={() => onDelete(rx.id)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600 disabled:opacity-50"
            ><Trash2 className="size-3.5" /> حذف</button>
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
      if (i < max) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
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
