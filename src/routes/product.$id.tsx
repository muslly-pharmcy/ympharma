import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Minus, ShoppingCart, Sparkles, Loader2, AlertTriangle, Pill, CheckCircle2, BookOpen, ChevronDown, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { categories, formatPrice, getProductById, products } from "@/lib/products";
import { useMergedProducts } from "@/lib/use-merged-products";
import { useLegacyMap, useRelatedProducts } from "@/lib/use-pharmacy-intel";
import { proxifyImage } from "@/lib/img-proxy";
import { handleImageError } from "@/lib/img-placeholder";
import { useCart } from "@/lib/cart";
import { getVitaminInfo, type VitaminInfo } from "@/lib/vitamin-info.functions";
import { readCache, writeCache, cacheKey } from "@/lib/vitamin-cache";
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
  const merged = useMergedProducts();
  // Match the merged item by id to read its DB legacyId (when sourced from DB).
  const mergedSelf = merged.find((m) => m.id === p.id);
  const legacyId = mergedSelf?.legacyId;
  const legacyMap = useLegacyMap(merged);
  const buckets = useRelatedProducts(legacyId);
  const intelRelated = buckets ? {
    same_condition: buckets.same_condition.map((id) => legacyMap.get(id)).filter(Boolean) as typeof merged,
    same_class: buckets.same_class.map((id) => legacyMap.get(id)).filter(Boolean) as typeof merged,
    explicit: buckets.explicit.map((id) => legacyMap.get(id)).filter(Boolean) as typeof merged,
    copurchase: buckets.copurchase.map((id) => legacyMap.get(id)).filter(Boolean) as typeof merged,
  } : null;
  const hasIntel = !!intelRelated && (
    intelRelated.same_condition.length + intelRelated.same_class.length +
    intelRelated.explicit.length + intelRelated.copurchase.length > 0
  );
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
            <img src={proxifyImage(p.img)} alt={p.name} onError={handleImageError} className="aspect-square w-full object-cover" />
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

        {(p.cat === "vitamins" || p.cat === "now" || p.cat === "medicine" || p.cat === "herbal") && (
          <VitaminAIInfo name={p.name} brand={p.brand} />
        )}

        {hasIntel && intelRelated && (
          <div className="space-y-6">
            {intelRelated.same_condition.length > 0 && (
              <IntelStrip title="💊 بدائل لنفس الحالة المرضية" items={intelRelated.same_condition} />
            )}
            {intelRelated.same_class.length > 0 && (
              <IntelStrip title="🧬 بدائل من نفس التصنيف الدوائي" items={intelRelated.same_class} />
            )}
            {intelRelated.explicit.length > 0 && (
              <IntelStrip title="✨ يُستخدم غالبًا مع هذا الدواء" items={intelRelated.explicit} />
            )}
            {intelRelated.copurchase.length > 0 && (
              <IntelStrip title="🛒 العملاء اشتروا أيضًا" items={intelRelated.copurchase} />
            )}
          </div>
        )}

        {!hasIntel && related.length > 0 && (
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
  const key = cacheKey(name, brand);
  const [open, setOpen] = useState(false);
  const [initialData, setInitialData] = useState<VitaminInfo | null>(null);

  // Hydrate from localStorage once per product key.
  useEffect(() => {
    setInitialData(readCache<VitaminInfo>(key));
  }, [key]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["vitamin-info", key],
    queryFn: async () => {
      const result = await fetchInfo({ data: { name, brand } });
      writeCache(key, result);
      return result;
    },
    enabled: open,
    initialData: initialData ?? undefined,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  });

  // Log Gemini errors to console + toast so they surface in admin logs via
  // the global window-error capture installed in main.tsx.
  useEffect(() => {
    if (isError) {
      const msg = error instanceof Error ? error.message : "Gemini fetch failed";
      console.error("[VitaminAIInfo]", { name, brand, msg });
      toast.error("تعذّر جلب المعلومات الذكية", { description: msg });
    }
  }, [isError, error, name, brand]);

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-right"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className="brand-gradient grid size-9 place-items-center rounded-xl text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-black">المهام الأساسية ومعلومات المنتج (AI)</h2>
            <p className="text-[11px] text-muted-foreground">
              {open ? "اضغط للإخفاء" : "اضغط لعرض الفوائد والاستخدامات والجرعة والتحذيرات"}
            </p>
          </div>
        </div>
        <ChevronDown className={`size-5 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
          {(isLoading || (isFetching && !data)) && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              جاري تجهيز المعلومات من Gemini...
            </div>
          )}

          {isError && !data && (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-bold text-destructive">
                <AlertTriangle className="size-4" />
                تعذّر جلب المعلومات الذكية
              </div>
              <p className="text-xs text-destructive/90">
                {error instanceof Error ? error.message : "خطأ غير معروف"}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-1 inline-flex items-center gap-1.5 self-start rounded-lg bg-destructive px-3 py-1.5 text-xs font-black text-destructive-foreground"
              >
                <RefreshCw className="size-3.5" /> إعادة المحاولة
              </button>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Medical disclaimer banner */}
              <div className="flex items-start gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <p className="text-[12px] font-bold leading-relaxed text-amber-900">
                  {data.disclaimer || "هذه المعلومات مولّدة بالذكاء الاصطناعي للاسترشاد فقط، ولا تُغني عن استشارة الطبيب أو الصيدلي."}
                </p>
              </div>

              <p className="rounded-xl bg-primary/10 p-3 text-sm font-bold leading-relaxed">{data.summary}</p>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock icon={<CheckCircle2 className="size-4 text-emerald-600" />} title="الفوائد" items={data.benefits} color="emerald" />
                <InfoBlock icon={<Pill className="size-4 text-blue-600" />} title="الاستخدامات الأساسية" items={data.uses} color="blue" />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-amber-800">
                  <Pill className="size-4" /> الجرعة العامة (للبالغين)
                </h3>
                <p className="text-sm leading-relaxed text-amber-900">{data.dosage}</p>
                <p className="mt-2 text-[11px] font-bold text-amber-700">
                  ⚠️ الجرعة قد تختلف حسب الحالة والعمر — استشر الطبيب قبل الاستخدام.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-rose-800">
                  <AlertTriangle className="size-4" /> تحذيرات وموانع الاستخدام
                </h3>
                <ul className="space-y-1 text-sm text-rose-900">
                  {data.warnings.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
                </ul>
              </div>

              {data.sources && data.sources.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-3">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
                    <BookOpen className="size-3.5" /> المصادر العلمية
                  </h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {data.sources.map((s, i) => (
                      <li key={i} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground">مولّد بواسطة Gemini • محفوظ محلياً لمدة 7 أيام</p>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} /> تحديث
                </button>
              </div>
            </div>
          )}
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
