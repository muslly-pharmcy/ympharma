import { MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { STATUSES, statusBadge, Empty, type Order } from "./shared";

export function OrdersTab({ orders, onStatus }: { orders: Order[]; onStatus: (id: string, s: string) => void }) {
  if (orders.length === 0) return <Empty text="لا توجد طلبات" />;
  return <>{orders.map((o) => <OrderCard key={o.id} order={o} onStatus={onStatus} />)}</>;
}

function OrderCard({ order, onStatus }: { order: Order; onStatus: (id: string, s: string) => void }) {
  const b = statusBadge(order.status);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-primary-deep">{order.id}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-EG")}</p>
          <p className="mt-1 text-sm font-bold">{order.customer_name} · <span dir="ltr" className="text-muted-foreground">{order.customer_phone}</span></p>
          <p className="text-xs text-muted-foreground">📍 {order.customer_address}</p>
          {order.notes && <p className="mt-1 text-xs">📝 {order.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
          <p className="text-lg font-black text-primary-deep">{formatPrice(Number(order.total))} ر.ي</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 rounded-xl bg-secondary/40 p-3 text-xs">
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between">
            <span>{it.name} × {it.qty}</span>
            <span className="font-bold">{formatPrice(it.price * it.qty)} ر.ي</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={order.status} onChange={(e) => onStatus(order.id, e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button
          onClick={() => openWhatsApp(buildStatusMessage({ name: order.customer_name, orderId: order.id, status: "confirmed" }), order.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> إشعار: جاهز/مؤكد</button>
        <button
          onClick={() => openWhatsApp(`مرحبًا ${order.customer_name}، بخصوص طلبك ${order.id} من صيدلية المصلي:`, order.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> واتساب العميل</button>
      </div>
    </div>
  );
}
