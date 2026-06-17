import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Minus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories, formatPrice, getProductById, products } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const p = getProductById(Number(params.id));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "منتج"} — صيدلية المصلي` },
      { name: "description", content: loaderData?.desc ?? `${loaderData?.brand ?? ""} — ${loaderData?.name ?? ""}. اشتريه الآن من صيدلية المصلي.` },
      { property: "og:title", content: `${loaderData?.name ?? "منتج"} — صيدلية المصلي` },
      { property: "og:description", content: loaderData?.desc ?? loaderData?.name ?? "" },
      { property: "og:image", content: loaderData?.img ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-8">
      <div>
        <h1 className="text-2xl font-black mb-2">المنتج غير موجود</h1>
        <Link to="/products" className="text-primary font-bold underline">العودة للكتالوج</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center text-center p-8">
      <p className="text-destructive">حدث خطأ: {String(error?.message ?? "")}</p>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const p = Route.useLoaderData();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const catName = categories.find((c) => c.id === p.cat)?.name ?? p.cat;
  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="مسار التصفح">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <Link to="/products" className="hover:text-foreground">المنتجات</Link>
          <ChevronRight className="size-3 rotate-180" />
          <Link to="/products" search={{ cat: p.cat }} className="hover:text-foreground">{catName}</Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <img src={p.img} alt={p.name} className="aspect-square w-full object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{p.brand}</p>
              <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">{p.name}</h1>
              {p.badge && <span className="mt-2 inline-block rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black text-destructive-foreground">{p.badge}</span>}
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-black text-primary-deep">{formatPrice(p.price)} <span className="text-base font-bold">ر.ي</span></span>
              {p.oldPrice && <span className="text-base font-bold text-muted-foreground line-through">{formatPrice(p.oldPrice)}</span>}
            </div>
            {p.desc && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-black">وصف المنتج</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-border bg-card">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center text-muted-foreground hover:text-foreground" aria-label="إنقاص">
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-sm font-black">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="grid size-10 place-items-center text-muted-foreground hover:text-foreground" aria-label="زيادة">
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                onClick={() => { for (let i = 0; i < qty; i++) add(p.id); toast.success("تمت الإضافة إلى السلة"); }}
                className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-primary-foreground shadow-card transition active:scale-95"
              >
                <ShoppingCart className="size-5" /> أضف إلى السلة
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px] font-bold text-muted-foreground">
              <div className="rounded-xl border border-border bg-card p-2">🚚 توصيل سريع</div>
              <div className="rounded-xl border border-border bg-card p-2">✅ منتج أصلي</div>
              <div className="rounded-xl border border-border bg-card p-2">💬 استشارة مجانية</div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((r) => <ProductCard key={r.id} product={r} />)}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
