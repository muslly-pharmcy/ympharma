import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Package2, ChevronLeft, Tag } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { MarketingBanner } from "@/components/marketing-banner";
import { listBundlesPublic } from "@/lib/bundles.functions";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "الباقات الموفّرة — صيدلية المصلي" },
      { name: "description", content: "باقات صحية موفّرة: البرد، السكري، الضغط، القلب، الفيتامينات، عناية الأم والطفل والإسعافات الأولية." },
      { property: "og:title", content: "باقات صيدلية المصلي الموفّرة" },
      { property: "og:description", content: "وفّر أكثر مع باقات مصممة لاحتياجاتك اليومية والمزمنة." },
    ],
  }),
  component: BundlesPage,
});

type Bundle = {
  id: string; slug: string; name: string; description: string | null; image_url: string | null;
  kind: string; discount_percent: number; fixed_price: number | null; subtotal: number;
  items: { legacy_id: number; qty: number; name: string | null; price: number | null; image_url: string | null }[];
};

function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useServerFn(listBundlesPublic);
  const { add } = useCart();

  useEffect(() => {
    let alive = true;
    load({}).then((rows) => { if (alive) { setBundles((rows as Bundle[]) ?? []); setLoading(false); } })
      .catch(() => setLoading(false));
    return () => { alive = false; };
  }, [load]);

  function addBundle(b: Bundle) {
    let added = 0;
    for (const it of b.items) {
      if (it.legacy_id && it.qty > 0) {
        add(it.legacy_id, it.qty);
        added += it.qty;
      }
    }
    toast.success(`أُضيفت ${added} عنصر إلى السلة من «${b.name}»`);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <MarketingBanner placement="home" />
        <header className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            <Package2 className="size-3.5" /> باقات موفّرة
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">باقاتنا الذكية لتوفير أكبر</h1>
          <p className="text-sm text-muted-foreground">احصل على أدويتك ومستلزماتك في باقة واحدة بسعر مخفّض.</p>
        </header>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : bundles.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد باقات متاحة حالياً.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b) => {
              const subtotal = Number(b.subtotal ?? 0);
              const final = b.fixed_price != null ? Number(b.fixed_price) : Math.round(subtotal * (1 - Number(b.discount_percent) / 100));
              const saved = Math.max(0, subtotal - final);
              return (
                <article key={b.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-elevated">
                  <div className="relative h-28 overflow-hidden bg-gradient-to-l from-emerald-500 via-teal-500 to-cyan-500">
                    <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_top_left,white,transparent_60%)]" />
                    <div className="relative flex h-full items-center gap-3 px-5 text-white">
                      <div className="grid size-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur"><Package2 className="size-7" /></div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black">{b.name}</h2>
                        <p className="text-[11px] font-bold opacity-90">{b.items.length} منتجات</p>
                      </div>
                      {b.discount_percent > 0 && (
                        <span className="ms-auto rounded-xl bg-white px-2.5 py-1 text-xs font-black text-rose-600 shadow"> -{b.discount_percent}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {b.description && <p className="line-clamp-2 text-xs text-muted-foreground">{b.description}</p>}
                    <ul className="space-y-1 text-xs">
                      {b.items.slice(0, 4).map((it, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 truncate">
                          <span className="truncate">• {it.name ?? "—"} <span className="text-muted-foreground">×{it.qty}</span></span>
                        </li>
                      ))}
                      {b.items.length > 4 && <li className="text-[11px] text-muted-foreground">+{b.items.length - 4} أكثر</li>}
                    </ul>
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
                      <div>
                        {saved > 0 && <p className="text-[11px] text-muted-foreground line-through">{formatPrice(subtotal)} ر.ي</p>}
                        <p className="text-xl font-black text-primary-deep">{formatPrice(final)} <span className="text-xs">ر.ي</span></p>
                        {saved > 0 && <p className="text-[11px] font-black text-emerald-600">وفّر {formatPrice(saved)} ر.ي</p>}
                      </div>
                      <button onClick={() => addBundle(b)} disabled={b.items.length === 0}
                        className="inline-flex items-center gap-1 rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-card disabled:opacity-50">
                        <Tag className="size-3.5" /> أضف للسلة
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="pt-4">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            تصفّح كل المنتجات <ChevronLeft className="size-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
