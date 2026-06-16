import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories } from "@/lib/products";
import { useMergedProducts } from "@/lib/use-merged-products";

type Search = { cat?: string; q?: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "كل المنتجات — صيدلية المصلي" },
      { name: "description", content: "تصفّح كل منتجات صيدلية المصلي: أدوية، فيتامينات NOW، أجهزة طبية، عناية، ومنتجات الأم والطفل." },
      { property: "og:title", content: "كتالوج المنتجات — صيدلية المصلي" },
      { property: "og:description", content: "أدوية أصلية، فيتامينات ومكملات NOW Foods، أجهزة طبية ومستلزمات العناية بأسعار منافسة." },
      { property: "og:url", content: "https://muslly.com/products" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/products" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "كل المنتجات — صيدلية المصلي",
          url: "https://muslly.com/products",
          description: "كتالوج منتجات صيدلية المصلي: أدوية، فيتامينات، أجهزة طبية، ومنتجات العناية.",
        }),
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { cat, q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const activeCat = cat ?? "all";

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (activeCat === "all" || p.cat === activeCat) &&
          (query.trim() === "" || p.name.includes(query.trim()) || p.brand.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [activeCat, query],
  );

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
