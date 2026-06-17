import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Minus, ShoppingCart, Sparkles, Loader2, AlertTriangle, Pill, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories, formatPrice, getProductById, products } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { getVitaminInfo } from "@/lib/vitamin-info.functions";
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

        {(p.cat === "vitamins" || p.cat === "now") && <VitaminAIInfo name={p.name} brand={p.brand} />}

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

function VitaminAIInfo({ name, brand }: { name: string; brand: string }) {
  const fetchInfo = useServerFn(getVitaminInfo);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vitamin-info", name, brand],
    queryFn: () => fetchInfo({ data: { name, brand } }),
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <div className="brand-gradient grid size-9 place-items-center rounded-xl text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-black">معلومات تفصيلية بالذكاء الاصطناعي</h2>
          <p className="text-[11px] text-muted-foreground">مولّدة بواسطة Gemini — استشر طبيبك دائماً</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          جاري تجهيز المعلومات...
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 p-3 text-sm">
          <span className="text-destructive">تعذّر جلب المعلومات</span>
          <button onClick={() => refetch()} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-black text-destructive-foreground">إعادة المحاولة</button>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <p className="rounded-xl bg-primary/10 p-3 text-sm font-bold leading-relaxed">{data.summary}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock icon={<CheckCircle2 className="size-4 text-emerald-600" />} title="الفوائد" items={data.benefits} color="emerald" />
            <InfoBlock icon={<Pill className="size-4 text-blue-600" />} title="الاستخدامات الأساسية" items={data.uses} color="blue" />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-amber-800">
              <Pill className="size-4" /> الجرعة العامة
            </h3>
            <p className="text-sm leading-relaxed text-amber-900">{data.dosage}</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-rose-800">
              <AlertTriangle className="size-4" /> تحذيرات
            </h3>
            <ul className="space-y-1 text-sm text-rose-900">
              {data.warnings.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoBlock({ icon, title, items, color }: { icon: React.ReactNode; title: string; items: string[]; color: "emerald" | "blue" }) {
  const bg = color === "emerald" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200";
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black">{icon} {title}</h3>
      <ul className="space-y-1 text-sm text-foreground/80">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span>•</span><span>{it}</span></li>)}
      </ul>
    </div>
  );
}
