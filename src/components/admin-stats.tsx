import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, FileText, DollarSign, Clock, TrendingUp, Trophy, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/products";

type Stats = {
  orders_today: number;
  rx_today: number;
  sales_today: number;
  pending_orders: number;
  pending_rx: number;
  orders_week: number;
  sales_week: number;
  top_products: { name: string; qty: number }[];
};

export function AdminStats({ refreshKey = 0 }: { refreshKey?: number }) {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.rpc("admin_stats").then(({ data, error }) => {
      if (!alive) return;
      if (!error && data) setS(data as Stats);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [refreshKey]);

  if (loading) {
    return <div className="grid place-items-center rounded-2xl border border-border bg-card p-6"><Loader2 className="size-5 animate-spin text-primary" /></div>;
  }
  if (!s) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="طلبات اليوم" value={String(s.orders_today)} icon={Package} tone="from-blue-500 to-blue-600" />
        <Card label="مبيعات اليوم" value={`${formatPrice(s.sales_today)} ر.ي`} icon={DollarSign} tone="from-emerald-500 to-emerald-600" />
        <Card label="روشتات اليوم" value={String(s.rx_today)} icon={FileText} tone="from-purple-500 to-purple-600" />
        <Card label="قيد المراجعة" value={String(s.pending_orders + s.pending_rx)} icon={Clock} tone="from-amber-500 to-amber-600" hint={`${s.pending_orders} طلب · ${s.pending_rx} روشتة`} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-muted-foreground">
            <TrendingUp className="size-4 text-primary" /> آخر 7 أيام
          </div>
          <p className="text-2xl font-black text-primary-deep">{s.orders_week} <span className="text-sm font-bold text-muted-foreground">طلب</span></p>
          <p className="text-sm font-bold text-emerald-600">{formatPrice(s.sales_week)} ر.ي مبيعات</p>
        </div>
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-muted-foreground">
            <Trophy className="size-4 text-amber-500" /> الأكثر مبيعاً (30 يوم)
          </div>
          {s.top_products.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ol className="space-y-1.5">
              {s.top_products.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">{i + 1}</span>
                    <span className="truncate font-bold">{p.name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-black">{p.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, icon: Icon, tone, hint }: { label: string; value: string; icon: typeof Package; tone: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <div className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-card`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-black text-primary-deep">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
