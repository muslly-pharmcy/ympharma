import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Package, CheckCircle2, Truck, Home, Clock, MessageCircle, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart, type StoredOrder } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { openWhatsApp } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";

type SearchT = { id?: string };

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): SearchT => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => ({
    meta: [
      { title: "تتبع الطلب — صيدلية المصلي" },
      { name: "description", content: "أدخل رقم طلبك لمتابعة حالته لحظة بلحظة من التجهيز والتأكيد حتى وصول المندوب إلى عنوانك." },
      { property: "og:title", content: "تتبع طلبك — صيدلية المصلي" },
      { property: "og:description", content: "متابعة حالة طلبك من التجهيز حتى التسليم مع تواصل مباشر عبر واتساب." },
      { property: "og:url", content: "https://muslly.com/track" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/track" }],
  }),
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

type CloudOrder = {
  id: string;
  status: StoredOrder["status"];
  total: number;
  createdAt: number;
  customerName: string;
  items: { id: number; qty: number; name: string; price: number }[];
};

type HistoryRow = { status: StoredOrder["status"]; created_at: string; note: string | null };

function TrackPage() {
  const { id: initialId } = Route.useSearch();
  const { orders } = useCart();
  const [input, setInput] = useState(initialId ?? "");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<CloudOrder | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function lookup(id: string, last4: string) {
    setLoading(true);
    setSearched(true);
    setErrMsg(null);
    try {
      const trimmed = id.trim();
      const digits = (last4.match(/\d/g) ?? []).join("").slice(-4);
      if (digits.length !== 4) {
        setErrMsg("أدخل آخر 4 أرقام من رقم جوال الطلب");
        setOrder(null); setHistory([]);
        return;
      }
      const [{ data, error }, { data: hist }] = await Promise.all([
        supabase.rpc("get_order_public" as never, { _id: trimmed, _phone_last4: digits } as never),
        supabase.rpc("get_order_history_public" as never, { _id: trimmed, _phone_last4: digits } as never),
      ]);
      if (error) {
        if (/rate_limited/i.test(error.message)) setErrMsg("تم تجاوز عدد المحاولات المسموح، انتظر قليلاً ثم أعد المحاولة.");
        console.error(error); setOrder(null); setHistory([]); return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setOrder(null); setHistory([]); return; }
      setOrder({
        id: row.id,
        status: (row.status as CloudOrder["status"]) ?? "pending",
        total: Number(row.total) || 0,
        createdAt: new Date(row.created_at).getTime(),
        customerName: row.customer_name,
        items: (row.items as CloudOrder["items"]) ?? [],
      });
      setHistory((hist as HistoryRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Do not auto-lookup on first paint — phone last-4 is now required.
    if (initialId) setInput(initialId);
  }, [initialId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black">تتبع طلبك</h1>
          <p className="text-sm text-muted-foreground">أدخل رقم الطلب وآخر 4 أرقام من جوالك لمتابعة الحالة.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && phoneLast4.trim()) lookup(input, phoneLast4); }} className="grid gap-2 rounded-2xl border border-border bg-card p-2 shadow-card md:grid-cols-[1fr_140px_auto]">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="مثال: AM-XXXXXXXXXXXX" className="rounded-xl bg-secondary/40 px-4 py-3 text-sm font-bold outline-none focus:bg-card" />
          <input value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="آخر 4 أرقام" inputMode="numeric" pattern="\d{4}" maxLength={4} className="rounded-xl bg-secondary/40 px-4 py-3 text-sm font-bold outline-none focus:bg-card text-center tracking-widest" />
          <button className="brand-gradient flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-primary-foreground">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} تتبع
          </button>
        </form>

        {errMsg && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800">{errMsg}</div>
        )}



        {searched && !loading && !order && (
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
                <p className="text-xs text-muted-foreground">{order.customerName} — {new Date(order.createdAt).toLocaleString("ar-EG")}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{steps.find((s) => s.key === order.status)?.label}</span>
            </div>

            <div className="relative">
              <div className="absolute right-5 top-5 bottom-5 w-0.5 bg-border" />
              <div className="space-y-5">
                {steps.map((step, idx) => {
                  const done = idx <= statusIndex(order.status);
                  const active = idx === statusIndex(order.status);
                  const hist = history.find((h) => h.status === step.key);
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`relative grid size-10 shrink-0 place-items-center rounded-full transition ${done ? "brand-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"} ${active ? "ring-4 ring-primary/20 animate-pulse" : ""}`}>
                        <step.icon className="size-5" />
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-black ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                        {hist && <p className="text-[11px] text-muted-foreground" dir="ltr">{new Date(hist.created_at).toLocaleString("ar-EG")}</p>}
                        {active && !hist && <p className="text-xs text-muted-foreground">جارٍ تحديث الحالة...</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="font-black">منتجات الطلب</p>
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
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
            <p className="mb-2 text-sm font-black">طلباتك السابقة من هذا الجهاز</p>
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
