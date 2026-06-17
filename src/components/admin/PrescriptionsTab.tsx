import { useState, useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { STATUSES, statusBadge, type Rx } from "./shared";
import { TabState, SearchBar, Pagination, PAGE_SIZE } from "./ui";

export function PrescriptionsTab({ rxs, onStatus, loading, error, onRetry }: {
  rxs: Rx[]; onStatus: (id: string, s: string) => void;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

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

  return (
    <div className="space-y-3">
      <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="ابحث برقم الروشتة، الاسم، أو الجوال..." />
      <TabState loading={loading} error={error} empty={filtered.length === 0} onRetry={onRetry}>
        <div className="space-y-3">
          {slice.map((r) => <RxCard key={r.id} rx={r} onStatus={onStatus} />)}
        </div>
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        <p className="text-center text-[11px] text-muted-foreground">إجمالي {filtered.length} روشتة</p>
      </TabState>
    </div>
  );
}

function RxCard({ rx, onStatus }: { rx: Rx; onStatus: (id: string, s: string) => void }) {
  const b = statusBadge(rx.status);
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
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
            <button key={i} type="button" onClick={() => setZoom(u)} className="block overflow-hidden rounded-lg border border-border">
              <img src={u} alt={`روشتة ${i + 1}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover transition hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 animate-in fade-in">
          <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(null); }} aria-label="إغلاق"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">✕</button>
          <img src={zoom} alt="عرض الروشتة بالحجم الكامل" onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-elevated" />
          <a href={zoom} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-foreground hover:bg-white">فتح الصورة الأصلية</a>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={rx.status} onChange={(e) => onStatus(rx.id, e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button
          onClick={() => openWhatsApp(buildStatusMessage({ name: rx.customer_name, orderId: rx.id, status: "confirmed" }), rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> إشعار: جاهز</button>
        <button
          onClick={() => openWhatsApp(`مرحبًا ${rx.customer_name}، بخصوص روشتتك ${rx.id} من صيدلية المصلي:`, rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> واتساب العميل</button>
      </div>
    </div>
  );
}
