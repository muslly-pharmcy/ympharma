import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package, CheckCircle2, Truck, Home, Clock, MessageCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart, type StoredOrder } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { openWhatsApp } from "@/lib/whatsapp";

type Search = { id?: string };

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): Search => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => ({ meta: [{ title: "تتبع الطلب — صيدلية المصلي" }] }),
  component: TrackPage,
});

const steps: { key: StoredOrder["status"]; label: string; icon: typeof Package }[] = [
  { key: "pending", label: "قيد المراجعة", icon: Clock },
  { key: "confirmed", label: "تم التأكيد", icon: CheckCircle2 },
  { key: "shipped", label: "في الطريق", icon: Truck },
  { key: "delivered", label: "تم التسليم", icon: Home },
];

function statusIndex(s: StoredOrder["status"]) {
  return steps.findIndex((x) => x.key === s);
}

function TrackPage() {
  const { id: initialId } = Route.useSearch();
  const { findOrder, orders } = useCart();
  const [input, setInput] = useState(initialId ?? "");
  const [searched, setSearched] = useState(Boolean(initialId));

  const order = input.trim() ? findOrder(input.trim()) : undefined;

  // simulated progress based on time
  const progress = order ? Math.min(3, Math.floor((Date.now() - order.createdAt) / (1000 * 60 * 60 * 6))) : 0;
  const effectiveStatus: StoredOrder["status"] = order
    ? order.status === "delivered" ? "delivered" : steps[Math.max(statusIndex(order.status), progress)].key
    : "pending";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black">تتبع طلبك</h1>
          <p className="text-sm text-muted-foreground">أدخل رقم الطلب لمتابعة حالته لحظة بلحظة.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSearched(true); }} className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-card">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="مثال: AM-XXXXXX" className="flex-1 rounded-xl bg-secondary/40 px-4 py-3 text-sm font-bold outline-none focus:bg-card" />
          <button className="brand-gradient flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-primary-foreground">
            <Search className="size-4" /> تتبع
          </button>
        </form>

        {searched && !order && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            لم نجد طلباً بهذا الرقم. تأكد من الرقم أو راسلنا على واتساب.
          </div>
        )}

        {order && (
          <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">رقم الطلب</p>
                <p className="text-xl font-black text-primary-deep">{order.id}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{steps.find((s) => s.key === effectiveStatus)?.label}</span>
            </div>

            <div className="relative">
              <div className="absolute right-5 top-5 bottom-5 w-0.5 bg-border" />
              <div className="space-y-5">
                {steps.map((step, idx) => {
                  const done = idx <= statusIndex(effectiveStatus);
                  const active = idx === statusIndex(effectiveStatus);
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`relative grid size-10 shrink-0 place-items-center rounded-full transition ${done ? "brand-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"} ${active ? "ring-4 ring-primary/20 animate-pulse" : ""}`}>
                        <step.icon className="size-5" />
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-black ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                        {active && <p className="text-xs text-muted-foreground">جارٍ تحديث الحالة...</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="font-black">منتجات الطلب</p>
              {order.items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.name} × {it.qty}</span>
                  <span className="font-bold">{formatPrice(it.price * it.qty)} ر.ي</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <span className="font-bold">الإجمالي</span>
                <span className="font-black text-primary-deep">{formatPrice(order.total)} ر.ي</span>
              </div>
            </div>

            <button
              onClick={() => openWhatsApp(`مرحبًا، أريد الاستفسار عن طلبي رقم ${order.id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-card hover:scale-[1.02]"
            >
              <MessageCircle className="size-5" /> الاستفسار عن الطلب
            </button>
          </div>
        )}

        {!searched && orders.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-black">طلباتك السابقة</p>
            <div className="space-y-1.5">
              {orders.slice(0, 5).map((o) => (
                <Link key={o.id} to="/track" search={{ id: o.id }} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm hover:bg-accent">
                  <span className="font-black text-primary-deep">{o.id}</span>
                  <span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-EG")}</span>
                  <span className="font-bold">{formatPrice(o.total)} ر.ي</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
