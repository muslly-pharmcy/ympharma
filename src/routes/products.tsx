import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories } from "@/lib/products";
import { useMergedProducts } from "@/lib/use-merged-products";

type Search = { cat?: string; q?: string; min?: number; max?: number; sort?: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    min: typeof s.min === "number" ? s.min : undefined,
    max: typeof s.max === "number" ? s.max : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "كل المنتجات — صيدلية المصلي" },
      { name: "description", content: "تصفّح كل منتجات صيدلية المصلي مع بحث وتصفية حسب الفئة والسعر: أدوية الحكمة ونوفارتيس واليمنية المصرية، فيتامينات، أجهزة طبية وعناية." },
      { property: "og:title", content: "كتالوج المنتجات — صيدلية المصلي" },
      { property: "og:description", content: "أدوية أصلية، فيتامينات ومكملات، أجهزة طبية ومستلزمات العناية بأسعار منافسة." },
      { property: "og:url", content: "https://muslly.com/products" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/products" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { cat, q, min, max, sort } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const [minP, setMinP] = useState<string>(min ? String(min) : "");
  const [maxP, setMaxP] = useState<string>(max ? String(max) : "");
  const [sortBy, setSortBy] = useState<string>(sort ?? "default");
  const activeCat = cat ?? "all";
  const products = useMergedProducts();

  const visible = useMemo(() => {
    const minN = Number(minP) || 0;
    const maxN = Number(maxP) || Infinity;
    const term = query.trim().toLowerCase();
    let arr = products.filter(
      (p) =>
        (activeCat === "all" || p.cat === activeCat) &&
        p.price >= minN && p.price <= maxN &&
        (term === "" || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)),
    );
    if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    else if (sortBy === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return arr;
  }, [activeCat, query, products, minP, maxP, sortBy]);

  const currentCatName = categories.find((c) => c.id === activeCat)?.name ?? "كل المنتجات";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader search={query} onSearch={setQuery} />
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">{currentCatName}</h1>
            <p className="text-sm text-muted-foreground">{visible.length} منتج متاح</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/products" className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${activeCat === "all" ? "brand-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>الكل</Link>
            {categories.map((c) => (
              <Link key={c.id} to="/products" search={{ cat: c.id }} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${activeCat === c.id ? "brand-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">السعر من (ر.ي)</label>
            <input type="number" inputMode="numeric" value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="0"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">السعر إلى (ر.ي)</label>
            <input type="number" inputMode="numeric" value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="∞"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">الترتيب</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="default">الافتراضي</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="name">الاسم (أبجدياً)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setMinP(""); setMaxP(""); setSortBy("default"); setQuery(""); }}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent">
              مسح الفلاتر
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
