import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Lightbulb, AlertTriangle, ArrowRight, Loader2, Package } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPharmacyRecommendations } from "@/lib/pharmacy-recommendations.functions";

export const Route = createFileRoute("/admin-pharmacy-recommendations")({
  head: () => ({
    meta: [
      { title: "توصيات الصيدلية الذكية — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <RecommendationsPage />
    </AdminGate>
  ),
});

const WINDOWS = [
  { days: 7, label: "7 أيام" },
  { days: 30, label: "30 يوم" },
  { days: 90, label: "90 يوم" },
];

function RecommendationsPage() {
  const [days, setDays] = useState(30);
  const fetchFn = useServerFn(getPharmacyRecommendations);
  const q = useQuery({
    queryKey: ["pharmacy-recommendations", days],
    queryFn: () => fetchFn({ data: { days, limit: 20 } }),
    retry: false,
    staleTime: 60_000,
  });

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> توصيات الصيدلية الذكية
        </h1>
        <Link
          to="/admin"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" /> العودة للإدارة
        </Link>
      </div>

      <div className="flex gap-2">
        {WINDOWS.map((w) => (
          <Button
            key={w.days}
            size="sm"
            variant={days === w.days ? "default" : "outline"}
            onClick={() => setDays(w.days)}
          >
            {w.label}
          </Button>
        ))}
      </div>

      {q.isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحليل…
        </div>
      )}
      {q.isError && <p className="text-destructive">تعذر التحميل.</p>}

      {q.data && (
        <>
          {q.data.restockAlerts.length > 0 && (
            <Card className="p-4 border-amber-500/40 bg-amber-500/5">
              <h2 className="font-semibold mb-2 flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" /> تنبيهات إعادة التزويد
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                منتجات تباع بكثرة لكن مخزونها أصبح منخفضاً (≤ 5).
              </p>
              <ul className="space-y-2">
                {q.data.restockAlerts.map((p) => (
                  <li
                    key={p.product_name}
                    className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0"
                  >
                    <span className="truncate">{p.product_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700">
                        بيع: {p.units_sold}
                      </Badge>
                      <Badge variant="destructive">متبقي: {p.current_stock ?? 0}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" /> الأكثر مبيعاً (آخر {q.data.windowDays} يوم)
            </h2>
            <div className="h-72 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={q.data.topProducts
                    .slice(0, 10)
                    .map((p) => ({ name: p.product_name.slice(0, 18), كمية: p.units_sold }))}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="كمية" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-muted-foreground border-b">
                    <th className="py-2">#</th>
                    <th className="py-2">المنتج</th>
                    <th className="py-2">الكمية المباعة</th>
                    <th className="py-2">عدد الطلبات</th>
                    <th className="py-2">الإيراد (ر.ي)</th>
                    <th className="py-2">المخزون الحالي</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.topProducts.map((p, i) => (
                    <tr key={p.product_name} className="border-b last:border-0">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2 max-w-xs truncate">{p.product_name}</td>
                      <td className="py-2 font-semibold">{p.units_sold.toLocaleString("ar")}</td>
                      <td className="py-2">{p.orders_count.toLocaleString("ar")}</td>
                      <td className="py-2">{p.revenue_yer.toLocaleString("ar")}</td>
                      <td className="py-2">
                        {p.current_stock === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : p.current_stock === 0 ? (
                          <Badge variant="destructive">نفد</Badge>
                        ) : p.current_stock <= 5 ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
                            {p.current_stock}
                          </Badge>
                        ) : (
                          p.current_stock.toLocaleString("ar")
                        )}
                      </td>
                    </tr>
                  ))}
                  {q.data.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        لا توجد مبيعات في هذه الفترة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
