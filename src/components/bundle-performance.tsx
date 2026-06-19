import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Package2, Loader2 } from "lucide-react";
import { adminBundlesReport } from "@/lib/bundles.functions";
import { listCampaigns } from "@/lib/campaigns.functions";
import { formatPrice } from "@/lib/products";

export function BundlePerformance() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadB = useServerFn(adminBundlesReport);
  const loadC = useServerFn(listCampaigns);

  useEffect(() => {
    let alive = true;
    Promise.all([loadB({}), loadC({})]).then(([b, c]) => {
      if (!alive) return;
      setBundles(b as any[]); setCamps(c as any[]); setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [loadB, loadC]);

  if (loading) return <div className="grid place-items-center rounded-2xl border border-border bg-card p-6"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-muted-foreground">
          <Package2 className="size-4 text-emerald-500" /> أداء الباقات
          <a href="/admin-bundles" className="ms-auto rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold hover:bg-accent">إدارة</a>
        </div>
        {bundles.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد باقات.</p> : (
          <ul className="space-y-1.5">
            {bundles.slice(0, 6).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5 text-sm">
                <span className="flex items-center gap-2 truncate font-bold">
                  <span className={`size-2 rounded-full ${b.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                  <span className="truncate">{b.name}</span>
                </span>
                <span className="shrink-0 text-xs">
                  <span className="font-black text-primary-deep">{b.sales_count}</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span className="font-bold text-emerald-600">{formatPrice(Number(b.revenue))} ر.ي</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-muted-foreground">
          📣 الحملات النشطة
          <a href="/admin-campaigns" className="ms-auto rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold hover:bg-accent">إدارة</a>
        </div>
        {camps.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد حملات.</p> : (
          <ul className="space-y-1.5">
            {camps.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2 py-1.5 text-sm">
                <span className="flex items-center gap-2 truncate font-bold">
                  <span className={`size-2 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                  <span className="truncate">{c.name}</span>
                  {c.discount_code && <span className="rounded-md bg-amber-100 px-1.5 text-[10px] font-black text-amber-700">{c.discount_code}</span>}
                </span>
                <span className="shrink-0 text-xs">
                  <span className="font-black text-primary-deep">{c.redemptions_count}</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span className="font-bold text-emerald-600">{formatPrice(Number(c.revenue ?? 0))} ر.ي</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
