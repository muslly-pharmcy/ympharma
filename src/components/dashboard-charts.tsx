import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, FileText, Trophy, Loader2 } from "lucide-react";
import { fetchRevenueSeries } from "@/lib/campaigns.functions";
import { formatPrice } from "@/lib/products";

type Series = {
  revenue: { day: string; revenue: number }[];
  orders: { day: string; orders: number }[];
  rx: { day: string; rx: number }[];
  top_products: { name: string; qty: number; revenue: number }[];
};

function fmtDay(s: string) {
  const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function DashboardCharts() {
  const [s, setS] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useServerFn(fetchRevenueSeries);
  useEffect(() => {
    let alive = true;
    load({ data: { days: 14 } }).then((res: any) => { if (alive) { setS(res); setLoading(false); } }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [load]);

  if (loading) return <div className="grid place-items-center rounded-2xl border border-border bg-card p-8"><Loader2 className="size-5 animate-spin text-primary" /></div>;
  if (!s) return null;

  const revData = (s.revenue ?? []).map((r) => ({ day: fmtDay(r.day), revenue: Number(r.revenue) }));
  const orderData = (s.orders ?? []).map((r) => ({ day: fmtDay(r.day), orders: Number(r.orders) }));
  const rxData = (s.rx ?? []).map((r) => ({ day: fmtDay(r.day), rx: Number(r.rx) }));
  const top = (s.top_products ?? []).slice(0, 6).map((t) => ({ name: t.name?.slice(0, 16) ?? "—", qty: Number(t.qty), revenue: Number(t.revenue) }));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard title="إيراد 14 يوم" icon={<TrendingUp className="size-4 text-emerald-500" />} className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => `${formatPrice(Number(v))} ر.ي`} />
            <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الأكثر مبيعاً" icon={<Trophy className="size-4 text-amber-500" />}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
            <Tooltip />
            <Bar dataKey="qty" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الطلبات اليومية" icon={<ShoppingBag className="size-4 text-blue-500" />}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={orderData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الروشتات اليومية" icon={<FileText className="size-4 text-purple-500" />}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rxData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="rx" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-card ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-muted-foreground">{icon}{title}</div>
      {children}
    </div>
  );
}
