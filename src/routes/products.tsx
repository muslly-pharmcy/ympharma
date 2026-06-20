import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 60;
import { Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories, catMatches } from "@/lib/products";
import { useMergedProducts } from "@/lib/use-merged-products";
import { useSmartSearch, useLegacyMap, REASON_LABELS } from "@/lib/use-pharmacy-intel";

type Search = { cat?: string; q?: string; min?: number; max?: number; sort?: string; brands?: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? s.cat : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    min: typeof s.min === "number" ? s.min : undefined,
    max: typeof s.max === "number" ? s.max : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    brands: typeof s.brands === "string" ? s.brands : undefined,
  }),
  head: () => ({
    meta: [
      { title: "كل المنتجات — صيدلية المصلي" },
      { name: "description", content: "تصفّح كل منتجات صيدلية المصلي مع بحث وتصفية حسب الفئة والماركة والسعر: أدوية الحكمة ونوفارتيس واليمنية المصرية وديرما للتجميل، فيتامينات، أجهزة طبية." },
      { property: "og:title", content: "كتالوج المنتجات — صيدلية المصلي" },
      { property: "og:description", content: "أدوية أصلية، فيتامينات ومكملات، أجهزة طبية ومستلزمات العناية بأسعار منافسة." },
      { property: "og:url", content: "https://muslly.com/products" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/products" }],
  }),
  component: ProductsPage,
});

// Featured brand chips (multi-select). All other brands still searchable via the search box.
const BRAND_CHIPS: { id: string; label: string }[] = [
  { id: "Hikma", label: "الحكمة" },
  { id: "Novartis", label: "نوفارتيس" },
  { id: "YEPCA", label: "اليمنية المصرية" },
  { id: "Derma Jordan", label: "ديرما الأردنية" },
  { id: "Derma", label: "ديرما للتجميل" },
  { id: "NOW Foods", label: "NOW Foods" },
  { id: "Johnson's", label: "جونسون" },
];

function ProductsPage() {
  const { cat, q, min, max, sort, brands } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const [minP, setMinP] = useState<string>(min ? String(min) : "");
  const [maxP, setMaxP] = useState<string>(max ? String(max) : "");
  const [sortBy, setSortBy] = useState<string>(sort ?? "default");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    brands ? brands.split(",").filter(Boolean) : [],
  );
  const activeCat = cat ?? "all";
  const products = useMergedProducts();
  const legacyMap = useLegacyMap(products);
  const { hits: smartHits, loading: smartLoading } = useSmartSearch(query);

  // Map smart-search legacy_ids back to actual merged products + reasons.
  const smartMatches = useMemo(() => {
    if (smartHits.length === 0) return [] as { product: typeof products[number]; reasons: string[] }[];
    const out: { product: typeof products[number]; reasons: string[] }[] = [];
    for (const h of smartHits) {
      const p = legacyMap.get(h.legacy_id);
      if (p) out.push({ product: p, reasons: h.reasons });
    }
    return out;
  }, [smartHits, legacyMap]);

  function toggleBrand(b: string) {
    setSelectedBrands((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  }

  const visible = useMemo(() => {
    const minN = Number(minP) || 0;
    const maxN = Number(maxP) || Infinity;
    const term = query.trim().toLowerCase();
    // Promote smart-matched legacy_ids to the front (skip the simple text filter
    // for those, since the SQL engine already matched them by ingredient/condition).
    const smartIds = new Set(smartMatches.map((m) => m.product.id));
    let arr = products.filter((p) => {
      if (activeCat !== "all" && !catMatches(activeCat, p.cat)) return false;
      if (p.price < minN || p.price > maxN) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (term && !smartIds.has(p.id)) {
        const hay = (p.name + " " + p.brand).toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    else if (sortBy === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    else if (smartIds.size > 0) {
      // Default sort with smart matches first
      arr = [...arr].sort((a, b) => Number(smartIds.has(b.id)) - Number(smartIds.has(a.id)));
    }
    return arr;
  }, [activeCat, query, products, minP, maxP, sortBy, selectedBrands, smartMatches]);

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

        {/* Search bar with smart-search */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            بحث ذكي: بالاسم، الماركة، المادة الفعالة، الحالة المرضية (مثل: سكري، ضغط، Metformin)
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثال: سكري، ضغط، حساسية، Metformin، Amlodipine…"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          {query.trim().length >= 2 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              {smartLoading && <span className="text-muted-foreground">جاري البحث الذكي…</span>}
              {!smartLoading && smartMatches.length > 0 && (
                <>
                  <span className="font-bold text-primary">
                    🧬 {smartMatches.length} نتيجة ذكية
                  </span>
                  {[...new Set(smartMatches.flatMap((m) => m.reasons))].slice(0, 5).map((r) => (
                    <span key={r} className="rounded-lg bg-primary/10 px-2 py-0.5 font-bold text-primary">
                      {REASON_LABELS[r] ?? r}
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
        </div>


        {/* Brand multi-filter */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">الشركة المنتجة (اختر واحدة أو أكثر)</span>
            {selectedBrands.length > 0 && (
              <button onClick={() => setSelectedBrands([])} className="text-[11px] font-bold text-primary hover:underline">مسح</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {BRAND_CHIPS.map((b) => {
              const active = selectedBrands.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBrand(b.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${active ? "brand-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
                  aria-pressed={active}
                >
                  {active ? "✓ " : ""}{b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price + sort */}
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
            <button onClick={() => { setMinP(""); setMaxP(""); setSortBy("default"); setQuery(""); setSelectedBrands([]); }}
              className="w-full rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent">
              مسح جميع الفلاتر
            </button>
          </div>
        </div>

        <ProductGrid visible={visible} />
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductGrid({ visible }: { visible: ReturnType<typeof Array.prototype.slice> extends infer T ? any[] : never }) {
  const [count, setCount] = useState(PAGE_SIZE);
  // Reset paging whenever the filtered set changes (new filter/search/sort).
  useEffect(() => { setCount(PAGE_SIZE); }, [visible]);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">لا توجد نتائج مطابقة</div>
    );
  }
  const shown = visible.slice(0, count);
  const remaining = visible.length - shown.length;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setCount((c) => c + PAGE_SIZE)}
            className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-secondary-foreground hover:bg-accent"
          >
            تحميل المزيد ({Math.min(PAGE_SIZE, remaining)} من {remaining})
          </button>
        </div>
      )}
    </>
  );
}
