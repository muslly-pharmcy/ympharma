import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getExecutiveDashboard } from "@/lib/admin-dashboard.functions";
import { RefreshAdminSession } from "@/components/admin/RefreshAdminSession";
import {
  runReactivationCampaign,
  runLoyaltyReminderCampaign,
} from "@/lib/marketing-automation.functions";

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchDashboard = useServerFn(getExecutiveDashboard);
  const reactivate = useServerFn(runReactivationCampaign);
  const remindLoyalty = useServerFn(runLoyaltyReminderCampaign);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["executive-dashboard"],
    queryFn: () => fetchDashboard(),
    refetchInterval: 60_000,
  });

  const reactivateMut = useMutation({
    mutationFn: () => reactivate({ data: { days: 30, limit: 50 } }),
    onSuccess: (r) => {
      toast.success(`تم جدولة ${r.queued} رسالة إعادة تنشيط`);
      qc.invalidateQueries({ queryKey: ["executive-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const loyaltyMut = useMutation({
    mutationFn: () => remindLoyalty({ data: { maxPoints: 50, limit: 100 } }),
    onSuccess: (r) => toast.success(`تم جدولة ${r.queued} تذكير ولاء`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">تعذّر تحميل اللوحة: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📊 لوحة التحكم التنفيذية</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => reactivateMut.mutate()}
            disabled={reactivateMut.isPending}
          >
            إعادة تنشيط العملاء
          </Button>
          <Button
            variant="secondary"
            onClick={() => loyaltyMut.mutate()}
            disabled={loyaltyMut.isPending}
          >
            تذكير الولاء
          </Button>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="إجمالي الطلبات" value={data.stats.ordersTotal} />
            <Stat label="طلبات (30 يوم)" value={data.stats.ordersLast30} />
            <Stat
              label="الإيرادات (30 يوم)"
              value={`${data.stats.revenueLast30.toLocaleString("ar-YE")} ر.ي`}
              variant="success"
            />
            <Stat label="عملاء نشطون" value={data.stats.activeCustomers30d} />
            <Stat label="وصفات طبية" value={data.stats.prescriptionsTotal} />
            <Stat
              label="طلبات بانتظار الموافقة"
              value={data.stats.pendingApprovals}
              variant={data.stats.pendingApprovals > 0 ? "warning" : "default"}
            />
            <Stat
              label="منتجات منخفضة المخزون"
              value={data.stats.lowStockCount}
              variant={data.stats.lowStockCount > 0 ? "danger" : "default"}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>📈 المبيعات (آخر 7 أيام)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklySales}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚠️ مخزون منخفض</CardTitle>
              </CardHeader>
              <CardContent>
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد منتجات منخفضة المخزون ✅</p>
                ) : (
                  <ul className="space-y-2">
                    {data.lowStock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="truncate ml-2">{p.name}</span>
                        <Badge variant={p.stock_qty === 0 ? "destructive" : "secondary"}>
                          {p.stock_qty}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>📋 طلبات موافقة معلقة</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد طلبات معلقة ✅</p>
              ) : (
                <ul className="divide-y">
                  {data.pendingApprovals.map((a) => (
                    <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.action_type} — {a.user_phone}
                        </p>
                        {a.customer_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {a.customer_message}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString("ar-YE")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "danger" | "success";
}) {
  const tone =
    variant === "warning"
      ? "border-orange-500/30 bg-orange-500/5"
      : variant === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : variant === "success"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card";
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
