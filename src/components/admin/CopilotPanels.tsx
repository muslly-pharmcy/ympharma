import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, AlertTriangle, Package, TrendingUp, Bug, FileText, PlayCircle, Wand2, ShieldCheck, Activity, TrendingDown, HeartPulse, Layers, Send } from "lucide-react";
import { toast } from "sonner";
import {
  askExecutiveCopilot,
  fetchCtoHealth,
  fetchExecAlerts,
  fetchInventoryIntel,
  fetchLatestExecReport,
  fetchSalesOpportunities,
  rotateCronSecretNow,
  runWeeklyEnrichNow,
  runWeeklyReportNow,
  fetchRevenueByCondition,
  fetchDecliningProducts,
  fetchChronicOverdue,
  fetchAutoBundleCandidates,
  enqueueChronicRefills,
} from "@/lib/pharmacy-copilot.functions";

type Alert = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  kind: string;
  title: string;
  body?: string;
  value?: number;
  cta?: string;
};

const AGENT_LABELS: Record<string, string> = {
  ceo: "🎯 المدير التنفيذي (CEO)",
  cto: "💻 المدير التقني (CTO)",
  marketing: "📣 مدير التسويق",
  sales: "💰 مدير المبيعات",
  inventory: "📦 مدير المخزون",
  cx: "❤️ تجربة العملاء",
  operations: "🚚 العمليات",
  bi: "📊 محلل أعمال",
};

const SUGGESTED: Record<string, string[]> = {
  ceo: ["ماذا أفعل اليوم؟", "أين أخسر إيراد هذا الأسبوع؟", "ما أهم 3 مخاطر الآن؟"],
  marketing: ["اقترح حملة WhatsApp قابلة للإطلاق غداً", "أي شريحة عملاء يجب استهدافها أولاً؟"],
  sales: ["ما الفرص cross-sell الأعلى أثراً؟", "أي منتجات يجب الترويج لها لتعظيم الهامش؟"],
  inventory: ["أي منتجات يجب طلبها هذا الأسبوع؟", "كم المخزون المعرض للانتهاء؟"],
  cto: ["ما أهم خطأ يجب إصلاحه فوراً؟"],
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-EG").format(Math.round(n));
}

function sevBadge(sev: string) {
  const map: Record<string, string> = {
    critical: "bg-rose-600 text-white",
    high: "bg-rose-100 text-rose-700 border border-rose-300",
    medium: "bg-amber-100 text-amber-800 border border-amber-300",
    low: "bg-sky-100 text-sky-800 border border-sky-300",
    info: "bg-secondary text-muted-foreground",
  };
  const label: Record<string, string> = {
    critical: "حرج",
    high: "عالي",
    medium: "متوسط",
    low: "منخفض",
    info: "معلوم",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[sev] ?? map.info}`}>{label[sev] ?? sev}</span>;
}

export function CopilotPanels() {
  const ask = useServerFn(askExecutiveCopilot);
  const getAlerts = useServerFn(fetchExecAlerts);
  const getInv = useServerFn(fetchInventoryIntel);
  const getSales = useServerFn(fetchSalesOpportunities);
  const getCto = useServerFn(fetchCtoHealth);
  const getReport = useServerFn(fetchLatestExecReport);
  const triggerReport = useServerFn(runWeeklyReportNow);
  const triggerEnrich = useServerFn(runWeeklyEnrichNow);
  const triggerRotate = useServerFn(rotateCronSecretNow);

  const getRevByCond = useServerFn(fetchRevenueByCondition);
  const getDeclining = useServerFn(fetchDecliningProducts);
  const getChronic = useServerFn(fetchChronicOverdue);
  const getBundleCands = useServerFn(fetchAutoBundleCandidates);
  const runEnqueue = useServerFn(enqueueChronicRefills);

  const [agent, setAgent] = useState<keyof typeof AGENT_LABELS>("ceo");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [asking, setAsking] = useState(false);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inv, setInv] = useState<any>(null);
  const [sales, setSales] = useState<any>(null);
  const [cto, setCto] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [revByCond, setRevByCond] = useState<any[] | null>(null);
  const [declining, setDeclining] = useState<any[] | null>(null);
  const [chronic, setChronic] = useState<any[] | null>(null);
  const [bundles, setBundles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, i, s, c, r, rc, dp, co, bc] = await Promise.all([
        getAlerts(), getInv(), getSales(), getCto(), getReport(),
        getRevByCond(), getDeclining(), getChronic(), getBundleCands(),
      ]);
      setAlerts(((a as any)?.alerts ?? []) as Alert[]);
      setInv(i); setSales(s); setCto(c); setReport(r);
      setRevByCond((rc as any[]) ?? []);
      setDeclining((dp as any[]) ?? []);
      setChronic((co as any[]) ?? []);
      setBundles((bc as any[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحميل البيانات الذكية");
    } finally {
      setLoading(false);
    }
  }, [getAlerts, getInv, getSales, getCto, getReport, getRevByCond, getDeclining, getChronic, getBundleCands]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = (await ask({ data: { question: text, agent } })) as { answer: string };
      setAnswer(res.answer);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاستعلام");
    } finally {
      setAsking(false);
    }
  };

  const onWeekly = async () => {
    setBusy("report");
    try {
      await triggerReport();
      toast.success("تم بناء التقرير الأسبوعي");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل بناء التقرير");
    } finally {
      setBusy(null);
    }
  };

  const onEnrich = async () => {
    setBusy("enrich");
    try {
      const out = (await triggerEnrich({ data: { limit: 20 } })) as { processed?: number; failed?: number };
      toast.success(`أُثري ${out.processed ?? 0} ملف عميل`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإثراء");
    } finally {
      setBusy(null);
    }
  };

  const onRotateCron = async () => {
    setBusy("rotate");
    try {
      const out = (await triggerRotate()) as { rescheduled?: number };
      toast.success(`تم تدوير سر الجدولة لـ ${out.rescheduled ?? 0} مهمة`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التدوير");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Executive alerts */}
      <Section icon={<AlertTriangle className="size-4 text-rose-500" />} title="تنبيهات تنفيذية" subtitle="أولويات اليوم — مرتبة حسب الأثر">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-emerald-700">لا توجد تنبيهات حرجة. كل شيء تحت السيطرة ✅</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {sevBadge(a.severity)}
                    <span className="text-sm font-bold">{a.title}</span>
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                </div>
                {a.cta && (
                  <a href={a.cta} className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20">
                    افتح
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* AI Copilot Q&A */}
      <Section icon={<Sparkles className="size-4 text-primary" />} title="المساعد التنفيذي بالذكاء" subtitle="اسأل أي وكيل — يجيب بناءً على بيانات الصيدلية الحقيقية">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(AGENT_LABELS) as Array<keyof typeof AGENT_LABELS>).map((a) => (
            <button
              key={a}
              onClick={() => setAgent(a)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                agent === a ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"
              }`}
            >
              {AGENT_LABELS[a]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="مثال: ماذا أفعل اليوم لزيادة الإيراد؟"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => submit()}
            disabled={asking || !question.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {asking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            اسأل
          </button>
        </div>

        {SUGGESTED[agent]?.length && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED[agent].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuestion(q);
                  submit(q);
                }}
                disabled={asking}
                className="rounded-full bg-secondary px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {answer && (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-3 text-sm leading-7">
            {answer}
          </div>
        )}
      </Section>

      {/* Inventory intel */}
      <div className="grid gap-3 md:grid-cols-2">
        <Section icon={<Package className="size-4 text-amber-600" />} title="وكيل المخزون" subtitle="منتجات تحتاج إعادة طلب">
          {!inv ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <div className="mb-2 grid grid-cols-3 gap-2 text-center text-xs">
                <Tile label="منخفض" value={inv.low_stock?.length ?? 0} tone="amber" />
                <Tile label="نفد" value={inv.out_of_stock?.length ?? 0} tone="rose" />
                <Tile label="قارب الانتهاء" value={inv.near_expiry?.length ?? 0} tone="sky" />
              </div>
              {inv.near_expiry_value_at_risk > 0 && (
                <p className="mb-2 text-xs text-rose-700">
                  قيمة معرّضة للانتهاء: <b>{fmt(Number(inv.near_expiry_value_at_risk))}</b> ر.ي
                </p>
              )}
              <List
                items={(inv.low_stock ?? []).slice(0, 5).map((p: any) => ({
                  primary: p.name,
                  secondary: `متوفر ${p.stock_qty} • أعد طلب ≈ ${p.suggested_reorder}`,
                }))}
                empty="لا توجد منتجات منخفضة"
              />
              {(inv.dead_stock?.length ?? 0) > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-bold">مخزون راكد (60+ يوم) — {inv.dead_stock.length}</summary>
                  <ul className="mt-2 space-y-1">
                    {inv.dead_stock.slice(0, 8).map((p: any) => (
                      <li key={p.legacy_id} className="flex justify-between gap-2 text-muted-foreground">
                        <span>{p.name}</span>
                        <span>{fmt(Number(p.tied_capital))} ر.ي</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Section>

        <Section icon={<TrendingUp className="size-4 text-emerald-600" />} title="وكيل المبيعات" subtitle="فرص cross-sell ومنتجات عالية الهامش">
          {!sales ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <h3 className="mb-1 text-xs font-bold text-muted-foreground">أعلى منتجات بالإيراد (30 يوم)</h3>
              <List
                items={(sales.top_revenue ?? []).slice(0, 5).map((p: any) => ({
                  primary: p.name,
                  secondary: `${fmt(Number(p.revenue))} ر.ي • ${p.units} وحدة`,
                }))}
                empty="لا توجد بيانات بعد"
              />
              {(sales.frequently_bought_together?.length ?? 0) > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-bold">يُشترى مع بعضه — {sales.frequently_bought_together.length} زوج</summary>
                  <ul className="mt-2 space-y-1">
                    {sales.frequently_bought_together.slice(0, 8).map((p: any, i: number) => (
                      <li key={i} className="text-muted-foreground">
                        {p.a_name} ↔ {p.b_name} <span className="text-primary">({p.freq}×)</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Section>
      </div>

      {/* CTO health + Weekly report */}
      <div className="grid gap-3 md:grid-cols-2">
        <Section icon={<Bug className="size-4 text-rose-500" />} title="صحة النظام (CTO)" subtitle="الأخطاء آخر 24 ساعة و 7 أيام">
          {!cto ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <div className="mb-2 grid grid-cols-3 gap-2 text-center text-xs">
                <Tile label="أخطاء 24س" value={cto.errors_24h ?? 0} tone={cto.errors_24h > 10 ? "rose" : "emerald"} />
                <Tile label="أخطاء 7أ" value={cto.errors_7d ?? 0} tone={cto.errors_7d > 50 ? "rose" : "emerald"} />
                <Tile label="حوادث uptime" value={cto.uptime_incidents_7d ?? 0} tone={cto.uptime_incidents_7d > 0 ? "amber" : "emerald"} />
              </div>
              <List
                items={(cto.recent ?? []).slice(0, 5).map((e: any) => ({
                  primary: e.message?.slice(0, 80) ?? "خطأ",
                  secondary: `${e.source} • ${new Date(e.occurred_at).toLocaleTimeString("ar")}`,
                }))}
                empty="لا توجد أخطاء حديثة 🎉"
              />
            </>
          )}
        </Section>

        <Section icon={<FileText className="size-4 text-primary" />} title="التقرير التنفيذي الأسبوعي" subtitle="يُبنى آلياً كل يوم أحد 03:30">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={onWeekly}
              disabled={busy === "report"}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "report" ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
              ابنِ الآن
            </button>
            <button
              onClick={onEnrich}
              disabled={busy === "enrich"}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
            >
              {busy === "enrich" ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              إثراء العملاء بالذكاء
            </button>
            <button
              onClick={onRotateCron}
              disabled={busy === "rotate"}
              title="يُحدّث المهام المجدولة لتستخدم سر CRON_SECRET الحالي"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
            >
              {busy === "rotate" ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              تدوير سر الجدولة
            </button>
          </div>

          {!report ? (
            <p className="text-xs text-muted-foreground">لم يُبنَ تقرير بعد. اضغط "ابنِ الآن".</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs text-muted-foreground">إيراد آخر 7 أيام:</span>
                <b>{fmt(Number(report.revenue_week ?? 0))}</b>
                <span className="text-xs">ر.ي</span>
                {report.growth_pct != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      Number(report.growth_pct) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {Number(report.growth_pct) >= 0 ? "↑" : "↓"} {Math.abs(Number(report.growth_pct))}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                الأسبوع السابق: {fmt(Number(report.revenue_prev_week ?? 0))} ر.ي
              </p>
              <p className="text-xs text-muted-foreground">
                أُنشئ: {report.generated_at ? new Date(report.generated_at).toLocaleString("ar") : "—"}
              </p>
              {(report.alerts?.alerts?.length ?? 0) > 0 && (
                <p className="text-xs">عدد التنبيهات النشطة: <b>{report.alerts.alerts.length}</b></p>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "rose" | "sky" }) {
  const cls =
    tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : tone === "sky" ? "text-sky-700" : "text-emerald-700";
  return (
    <div className="rounded-xl bg-secondary/60 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-extrabold ${cls}`}>{value}</div>
    </div>
  );
}

function List({ items, empty }: { items: { primary: string; secondary?: string }[]; empty: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((it, i) => (
        <li key={i} className="flex items-start justify-between gap-3 py-1.5 text-xs">
          <span className="line-clamp-2">{it.primary}</span>
          {it.secondary && <span className="shrink-0 text-muted-foreground">{it.secondary}</span>}
        </li>
      ))}
    </ul>
  );
}
