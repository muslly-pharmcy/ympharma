import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, TrendingUp, Users, Heart, AlertTriangle, Package, ArrowLeft, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchExecDashboard, listAgentRuns, runIntelNow } from "@/lib/pharmacy-intel-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { CopilotPanels } from "@/components/admin/CopilotPanels";

export const Route = createFileRoute("/admin-command")({
  head: () => ({
    meta: [
      { title: "غرفة القيادة — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CommandCenter,
});

const SEGMENT_LABELS: Record<string, string> = {
  new: "جدد",
  active: "نشطون",
  vip: "VIP",
  chronic: "مرضى مزمنون",
  declining: "بدأوا يتراجعون",
  dormant: "خاملون",
};

const CAT_LABELS: Record<string, string> = {
  diabetes: "السكري",
  hypertension: "الضغط",
  cardiology: "القلب",
  allergy: "الحساسية",
  asthma: "الربو",
  gi: "الجهاز الهضمي",
  antibiotics: "مضادات حيوية",
  neurology: "الأعصاب",
  dermatology: "الجلدية",
  pediatrics: "أطفال",
  womens_health: "صحة المرأة",
  vitamins: "فيتامينات",
  pain: "الألم",
  respiratory: "تنفسي",
  ophthalmology: "العيون",
  urology: "المسالك",
  hormonal: "الهرمونات",
  oncology: "الأورام",
  mental_health: "الصحة النفسية",
  other: "أخرى",
};

type Dashboard = {
  revenue_today: number;
  revenue_month: number;
  orders_today: number;
  orders_month: number;
  total_customers: number;
  repeat_customers: number;
  repeat_rate: number;
  chronic_patients: number;
  segments: Record<string, number>;
  top_diseases: { cat: string; units: number; revenue: number }[];
  top_classes: { class: string; units: number }[];
  top_bundles: { name: string; sales: number; revenue: number }[];
  inventory_low_stock: number;
  inventory_oos: number;
  lost_revenue_30d: number;
  recovered_revenue_30d: number;
  marketing_queue: { pending: number; approved: number; sent_today: number };
  generated_at: string;
};

type AgentRun = {
  id: string;
  agent: string;
  kind: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: string | null;
  impact_estimate: number | null;
  confidence: number | null;
  details: Record<string, unknown>;
};

function CommandCenter() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  const getDash = useServerFn(fetchExecDashboard);
  const getRuns = useServerFn(listAgentRuns);
  const trigger = useServerFn(runIntelNow);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([getDash(), getRuns({ data: { limit: 20 } })]);
      setDash(d as Dashboard);
      setRuns(r as AgentRun[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [getDash, getRuns]);

  useEffect(() => {
    if (authed) {
      load();
      const t = setInterval(load, 60_000);
      return () => clearInterval(t);
    }
  }, [authed, load]);

  if (authed === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="mb-3 text-sm text-muted-foreground">يلزم تسجيل الدخول كمسؤول.</p>
          <Link to="/admin" className="text-primary underline">الذهاب لتسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  if (authed === null || (loading && !dash)) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  const onRebuild = async () => {
    setRebuilding(true);
    try {
      await trigger();
      toast.success("تم إعادة بناء بيانات العملاء");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">غرفة قيادة الصيدلية</h1>
            <p className="text-xs text-muted-foreground">يتم التحديث كل دقيقة — آخر تحديث: {dash ? new Date(dash.generated_at).toLocaleTimeString("ar") : "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin-marketing" className="rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/25">📣 قائمة الحملات</Link>
            <Link to="/admin-agents" className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">🤖 سجل الوكلاء</Link>
            <Link to="/admin-workforce" className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">⚡ غرفة الوكلاء</Link>
            <button onClick={onRebuild} disabled={rebuilding} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {rebuilding ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              إعادة بناء الآن
            </button>
            <button onClick={load} className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تحديث">
              <RefreshCw className="size-4" />
            </button>
            <Link to="/admin" className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="رجوع">
              <ArrowLeft className="size-4 rotate-180" />
            </Link>
          </div>
        </header>

        {dash && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="إيراد اليوم" value={fmt(dash.revenue_today) + " ر.ي"} icon={<TrendingUp className="size-4" />} />
              <Kpi label="إيراد الشهر" value={fmt(dash.revenue_month) + " ر.ي"} icon={<TrendingUp className="size-4" />} />
              <Kpi label="طلبات اليوم" value={dash.orders_today.toString()} icon={<Package className="size-4" />} />
              <Kpi label="طلبات الشهر" value={dash.orders_month.toString()} icon={<Package className="size-4" />} />
              <Kpi label="إجمالي العملاء" value={dash.total_customers.toString()} icon={<Users className="size-4" />} />
              <Kpi label="عملاء متكررون" value={`${dash.repeat_customers} (${dash.repeat_rate}%)`} icon={<Users className="size-4" />} />
              <Kpi label="مرضى مزمنون" value={dash.chronic_patients.toString()} icon={<Heart className="size-4 text-rose-500" />} />
              <Kpi label="مخزون منخفض / نفد" value={`${dash.inventory_low_stock} / ${dash.inventory_oos}`} icon={<AlertTriangle className="size-4 text-amber-500" />} />
            </div>

            {/* AI Executive Copilot + Alerts + Inventory/Sales/CTO/Report */}
            <CopilotPanels />



            {/* Revenue forensics */}
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="إيراد مفقود (30 يوم)" subtitle="طلبات ملغاة">
                <div className="text-3xl font-extrabold text-rose-600">{fmt(dash.lost_revenue_30d)} <span className="text-base text-muted-foreground">ر.ي</span></div>
              </Card>
              <Card title="إيراد مُستردّ (30 يوم)" subtitle="عملاء طلبوا بعد رسالة تسويق">
                <div className="text-3xl font-extrabold text-emerald-600">{fmt(dash.recovered_revenue_30d)} <span className="text-base text-muted-foreground">ر.ي</span></div>
              </Card>
            </div>

            {/* Segments */}
            <Card title="شرائح العملاء" subtitle="من محرك التحليل الليلي">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                {Object.entries(SEGMENT_LABELS).map(([k, label]) => (
                  <div key={k} className="rounded-xl bg-secondary/60 p-3 text-center">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-xl font-bold">{dash.segments?.[k] ?? 0}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top diseases + classes */}
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="أعلى الأمراض (30 يوم)">
                <ul className="divide-y divide-border">
                  {dash.top_diseases.length === 0 && <li className="py-3 text-sm text-muted-foreground">لا توجد بيانات بعد</li>}
                  {dash.top_diseases.map((d) => (
                    <li key={d.cat} className="flex items-center justify-between py-2">
                      <span className="text-sm">{CAT_LABELS[d.cat] ?? d.cat}</span>
                      <span className="text-xs text-muted-foreground">{d.units} وحدة • {fmt(Number(d.revenue))} ر.ي</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="أعلى التصنيفات الدوائية">
                <ul className="divide-y divide-border">
                  {dash.top_classes.length === 0 && <li className="py-3 text-sm text-muted-foreground">لا توجد بيانات بعد</li>}
                  {dash.top_classes.map((c, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm">{c.class}</span>
                      <span className="text-xs text-muted-foreground">{c.units} وحدة</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Marketing queue summary + bundles */}
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="قائمة الحملات">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="قيد المراجعة" value={dash.marketing_queue?.pending ?? 0} tone="amber" />
                  <Stat label="معتمدة" value={dash.marketing_queue?.approved ?? 0} tone="emerald" />
                  <Stat label="أُرسلت اليوم" value={dash.marketing_queue?.sent_today ?? 0} tone="primary" />
                </div>
                <Link to="/admin-marketing" className="mt-3 inline-block text-xs font-bold text-primary underline">فتح القائمة →</Link>
              </Card>
              <Card title="أعلى الباقات">
                <ul className="divide-y divide-border">
                  {dash.top_bundles.length === 0 && <li className="py-3 text-sm text-muted-foreground">لا توجد باقات نشطة</li>}
                  {dash.top_bundles.map((b, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.sales} عملية • {fmt(Number(b.revenue ?? 0))} ر.ي</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Recent agent runs */}
            <Card title="آخر تشغيلات الوكلاء" subtitle="من محرك التحليل الليلي">
              <ul className="divide-y divide-border">
                {runs.length === 0 && <li className="py-3 text-sm text-muted-foreground">لا توجد تشغيلات بعد — اضغط "إعادة بناء الآن"</li>}
                {runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex size-2 rounded-full ${r.status === "ok" ? "bg-emerald-500" : r.status === "running" ? "bg-amber-500" : "bg-rose-500"}`} />
                      <span className="font-mono text-xs">{r.agent}</span>
                      <span className="text-xs text-muted-foreground">{r.kind}</span>
                    </div>
                    <span className="text-xs">{r.summary ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString("ar")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "primary" }) {
  const cls =
    tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-primary";
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-extrabold ${cls}`}>{value}</div>
    </div>
  );
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-EG").format(Math.round(n));
}
