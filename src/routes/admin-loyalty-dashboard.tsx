import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Award, Coins, TrendingUp, Users, ArrowRight, Loader2 } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoyaltyOverview } from "@/lib/loyalty-admin.functions";

export const Route = createFileRoute("/admin-loyalty-dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الولاء — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <LoyaltyDashboardPage />
    </AdminGate>
  ),
});

const TIER_COLORS: Record<string, string> = {
  bronze: "#b45309",
  silver: "#64748b",
  gold: "#eab308",
  platinum: "#6366f1",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "برونزي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

function LoyaltyDashboardPage() {
  const fetchOverview = useServerFn(getLoyaltyOverview);
  const q = useQuery({
    queryKey: ["admin-loyalty-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center gap-2 text-muted-foreground" dir="rtl">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل البيانات…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <p className="container mx-auto p-6 text-destructive" dir="rtl">
        تعذر تحميل البيانات.
      </p>
    );
  }

  const { totals, tierDistribution, topMembers, recentTransactions } = q.data;
  const chartData = tierDistribution.map((t) => ({
    name: TIER_LABEL[t.tier] ?? t.tier,
    tier: t.tier,
    أعضاء: t.count,
    نقاط: t.totalPoints,
  }));

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" /> لوحة تحكم الولاء
        </h1>
        <Link
          to="/admin"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" /> العودة للإدارة
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="إجمالي الحسابات" value={totals.accounts.toLocaleString("ar")} />
        <Stat icon={Users} label="مرتبط بمستخدم" value={totals.linkedToUsers.toLocaleString("ar")} />
        <Stat icon={Coins} label="إجمالي النقاط" value={totals.totalPoints.toLocaleString("ar")} />
        <Stat
          icon={TrendingUp}
          label="إجمالي المشتريات (ر.ي)"
          value={totals.totalSpentYer.toLocaleString("ar")}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">توزيع الأعضاء حسب المستوى</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="أعضاء"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e) => `${e.name}: ${e.value}`}
                >
                  {chartData.map((d) => (
                    <Cell key={d.tier} fill={TIER_COLORS[d.tier] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">النقاط لكل مستوى</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="نقاط" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">أعلى 10 أعضاء بالنقاط</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground border-b">
                <th className="py-2">#</th>
                <th className="py-2">الجوال</th>
                <th className="py-2">المستوى</th>
                <th className="py-2">النقاط</th>
                <th className="py-2">إجمالي المشتريات</th>
              </tr>
            </thead>
            <tbody>
              {topMembers.map((m, i) => (
                <tr key={m.phone_number} className="border-b last:border-0">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2 font-mono">{m.phone_number}</td>
                  <td className="py-2">
                    <Badge
                      variant="outline"
                      style={{ borderColor: TIER_COLORS[m.tier], color: TIER_COLORS[m.tier] }}
                    >
                      {TIER_LABEL[m.tier] ?? m.tier}
                    </Badge>
                  </td>
                  <td className="py-2 font-semibold">{m.points.toLocaleString("ar")}</td>
                  <td className="py-2">{m.total_spent_yer.toLocaleString("ar")} ر.ي</td>
                </tr>
              ))}
              {topMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    لا توجد بيانات بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">آخر 20 عملية</h2>
        <ul className="divide-y">
          {recentTransactions.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{t.description ?? t.type}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {t.phone_number} • {new Date(t.created_at).toLocaleString("ar")}
                </p>
              </div>
              <span
                className={`font-mono font-semibold ${
                  t.points >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {t.points >= 0 ? "+" : ""}
                {t.points}
              </span>
            </li>
          ))}
          {recentTransactions.length === 0 && (
            <li className="py-6 text-center text-muted-foreground text-sm">لا توجد عمليات بعد.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="rounded-full bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold truncate">{value}</p>
      </div>
    </Card>
  );
}
