import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { proxifyImage } from "@/lib/img-proxy";
import { handleImageError } from "@/lib/img-placeholder";
import { openWhatsApp, WHATSAPP_NUMBER, buildOrderMessage } from "@/lib/whatsapp";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة الطلب — صيدلية المصلي" },
      { name: "description", content: "راجع منتجات سلتك وأكمل الطلب بسهولة، يصلك تأكيد فوري عبر واتساب مع تتبع لحالة التوصيل." },
      { property: "og:title", content: "سلة الطلب — صيدلية المصلي" },
      { property: "og:description", content: "أكمل عملية الشراء وأرسل طلبك مباشرة عبر واتساب مع تتبع الحالة." },
      { property: "og:url", content: "https://muslly.com/cart" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { detailed, total, setQty, remove, placeOrder } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (detailed.length === 0) return toast.error("السلة فارغة");
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("الرجاء تعبئة كل البيانات");
    setBusy(true);
    try {
      const customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() || undefined };
      const order = await placeOrder(customer);
      const msg = buildOrderMessage({ orderId: order.id, items: order.items, total: order.total, customer });
      toast.success(`تم تأكيد الطلب ${order.id} — جارٍ فتح واتساب...`);
      openWhatsApp(msg);
      setTimeout(() => navigate({ to: "/track", search: { id: order.id } }), 600);
    } catch (e: any) {
      console.error("[checkout]", e);
      toast.error("تعذّر حفظ الطلب — سيُعاد المحاولة تلقائياً عند تحسّن الشبكة. لا تغلق الصفحة.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-black"><ShoppingBag className="size-7 text-primary" /> سلة الطلب</h1>

        {detailed.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card py-20 text-center">
            <p className="text-lg font-bold text-muted-foreground">سلتك فارغة</p>
            <Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-2xl brand-gradient px-5 py-3 text-sm font-black text-primary-foreground shadow-card">ابدأ التسوّق</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {detailed.map(({ product, qty }) => (
                <div key={product.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 animate-in fade-in slide-in-from-bottom-2">
                  <img src={proxifyImage(product.img)} alt={product.name} onError={handleImageError} loading="lazy" decoding="async" className="size-20 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">{product.brand}</p>
                    <h3 className="text-sm font-bold leading-snug">{product.name}</h3>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                        <button aria-label="تقليل الكمية" onClick={() => setQty(product.id, qty - 1)} className="grid size-7 place-items-center rounded-lg hover:bg-card"><Minus className="size-3.5" /></button>
                        <span className="w-7 text-center text-sm font-black">{qty}</span>
                        <button aria-label="زيادة الكمية" onClick={() => setQty(product.id, qty + 1)} className="grid size-7 place-items-center rounded-lg hover:bg-card"><Plus className="size-3.5" /></button>
                      </div>
                      <p className="text-sm font-black text-primary-deep">{formatPrice(product.price * qty)} ر.ي</p>
                      <button onClick={() => remove(product.id)} className="grid size-9 place-items-center rounded-xl text-destructive hover:bg-destructive/10" aria-label="حذف"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCheckout} className="sticky top-32 h-fit space-y-3 rounded-3xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-lg font-black">إتمام الطلب</h2>
              <div className="flex justify-between text-sm"><span>عدد المنتجات</span><span className="font-black">{detailed.reduce((s, x) => s + x.qty, 0)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-base"><span className="font-bold">الإجمالي</span><span className="font-black text-primary-deep">{formatPrice(total)} ر.ي</span></div>

              <div className="space-y-2 pt-3">
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الجوال" type="tel" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان (المدينة، الحي، الشارع)" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" rows={2} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>

              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-elevated transition hover:scale-[1.02] disabled:opacity-60">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <MessageCircle className="size-5" />}
                {busy ? "جارٍ الإرسال..." : "إرسال الطلب عبر واتساب"}
              </button>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-500" /> يُحفظ الطلب في حسابنا ويُرسل تلقائياً إلى +{WHATSAPP_NUMBER}</p>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
