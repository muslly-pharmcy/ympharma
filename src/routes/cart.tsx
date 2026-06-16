import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, CheckCircle2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { openWhatsApp, WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "سلة الطلب — صيدلية المصلي" }] }),
  component: CartPage,
});

function buildOrderMessage(orderId: string, items: { name: string; qty: number; price: number }[], total: number, c: { name: string; phone: string; address: string; notes?: string }) {
  const lines = [
    "🛒 *طلب جديد — صيدلية المصلي*",
    `رقم الطلب: ${orderId}`,
    "",
    "*المنتجات:*",
    ...items.map((i, idx) => `${idx + 1}. ${i.name} × ${i.qty} = ${formatPrice(i.price * i.qty)} ر.ي`),
    "",
    `*الإجمالي:* ${formatPrice(total)} ر.ي`,
    "",
    "*بيانات العميل:*",
    `الاسم: ${c.name}`,
    `الجوال: ${c.phone}`,
    `العنوان: ${c.address}`,
    c.notes ? `ملاحظات: ${c.notes}` : "",
    "",
    "تم الإرسال تلقائياً من الموقع.",
  ];
  return lines.filter(Boolean).join("\n");
}

function CartPage() {
  const { detailed, total, setQty, remove, placeOrder } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (detailed.length === 0) return toast.error("السلة فارغة");
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("الرجاء تعبئة كل البيانات");

    const customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() || undefined };
    const order = placeOrder(customer);
    const msg = buildOrderMessage(order.id, order.items, order.total, customer);
    toast.success(`تم إنشاء الطلب ${order.id} — جارٍ فتح واتساب...`);
    openWhatsApp(msg);
    setTimeout(() => navigate({ to: "/track", search: { id: order.id } }), 600);
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
                  <img src={product.img} alt={product.name} className="size-20 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">{product.brand}</p>
                    <h3 className="text-sm font-bold leading-snug">{product.name}</h3>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                        <button onClick={() => setQty(product.id, qty - 1)} className="grid size-7 place-items-center rounded-lg hover:bg-card"><Minus className="size-3.5" /></button>
                        <span className="w-7 text-center text-sm font-black">{qty}</span>
                        <button onClick={() => setQty(product.id, qty + 1)} className="grid size-7 place-items-center rounded-lg hover:bg-card"><Plus className="size-3.5" /></button>
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

              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-elevated transition hover:scale-[1.02]">
                <MessageCircle className="size-5" /> إرسال الطلب عبر واتساب
              </button>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-500" /> يتم إرسال الطلب تلقائياً إلى +{WHATSAPP_NUMBER}</p>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
