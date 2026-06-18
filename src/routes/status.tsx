import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AlertTriangle, CheckCircle2, Activity, Wifi, Globe2, ShieldAlert, Printer } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "حالة الخدمة — صيدلية المصلي" },
      { name: "description", content: "حالة موقع صيدلية المصلي الحالية، الحوادث المفتوحة، وحلول مشاكل الاتصال من شبكات معينة مثل يمن نت." },
      { property: "og:title", content: "حالة الخدمة — صيدلية المصلي" },
      { property: "og:description", content: "تابع حالة الموقع وتحديثات أي انقطاع، مع حلول الاتصال من الشبكات المحجوبة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

type Check = { ok: boolean; checked_at: string; latency_ms: number | null };
type Incident = {
  id: string;
  started_at: string;
  ended_at: string | null;
  severity: "minor" | "major" | "critical";
  summary: string;
};

function StatusPage() {
  const checks = useQuery({
    queryKey: ["uptime-checks"],
    queryFn: async (): Promise<Check[]> => {
      const { data } = await supabase
        .from("uptime_checks")
        .select("ok,checked_at,latency_ms")
        .order("checked_at", { ascending: false })
        .limit(90);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const incidents = useQuery({
    queryKey: ["uptime-incidents"],
    queryFn: async (): Promise<Incident[]> => {
      const { data } = await supabase
        .from("uptime_incidents")
        .select("id,started_at,ended_at,severity,summary")
        .order("started_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Incident[];
    },
    refetchInterval: 60_000,
  });

  const open = (incidents.data ?? []).filter((i) => !i.ended_at);
  const recent = checks.data ?? [];
  const lastOk = recent[0]?.ok ?? true;
  const okRate = recent.length
    ? Math.round((recent.filter((c) => c.ok).length / recent.length) * 100)
    : 100;

  const overall: "ok" | "degraded" | "down" =
    open.some((i) => i.severity === "critical") || !lastOk
      ? "down"
      : open.length > 0 || okRate < 95
        ? "degraded"
        : "ok";

  function durationText(start: string, end: string | null): string {
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const mins = Math.max(1, Math.round((e - s) / 60000));
    if (mins < 60) return `${mins} دقيقة`;
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h < 24) return `${h} ساعة${m ? ` و${m} دقيقة` : ""}`;
    const d = Math.floor(h / 24); return `${d} يوم${h % 24 ? ` و${h % 24} ساعة` : ""}`;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <style>{`@media print {
        header, footer, nav, .no-print { display: none !important; }
        body { background: white; }
        main { max-width: 100% !important; padding: 1cm !important; }
      }`}</style>
      <div className="no-print"><SiteHeader /></div>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-foreground">حالة الخدمة</h1>
            <p className="text-sm text-muted-foreground">
              تحديث آلي كل دقيقة. تقرير الحالة الحالية وآخر الحوادث.
            </p>
          </div>
          <button onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground hover:bg-primary-deep">
            <Printer className="size-4" /> تنزيل تقرير PDF
          </button>
        </header>

        <section className={`rounded-2xl border p-6 ${
          overall === "ok"
            ? "border-emerald-200 bg-emerald-50"
            : overall === "degraded"
              ? "border-amber-200 bg-amber-50"
              : "border-rose-200 bg-rose-50"
        }`}>
          <div className="flex items-start gap-4">
            {overall === "ok" ? (
              <CheckCircle2 className="size-10 text-emerald-600" />
            ) : (
              <AlertTriangle className={`size-10 ${overall === "down" ? "text-rose-600" : "text-amber-600"}`} />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-black">
                {overall === "ok" && "جميع الخدمات تعمل بشكل طبيعي"}
                {overall === "degraded" && "أداء متدهور — بعض المستخدمين قد يلاحظون بطئاً"}
                {overall === "down" && "هناك انقطاع في الخدمة حالياً"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                نسبة التوفر آخر {recent.length || 0} فحص: {okRate}%
              </p>
            </div>
          </div>
        </section>

        {/* Sparkline-ish bar of checks */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black">
            <Activity className="size-4" /> آخر الفحوصات
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فحوصات مسجلة بعد.</p>
          ) : (
            <div className="flex h-12 items-end gap-[2px]" dir="ltr">
              {recent
                .slice()
                .reverse()
                .map((c, i) => (
                  <div
                    key={i}
                    title={`${new Date(c.checked_at).toLocaleString("ar")} — ${c.ok ? "ok" : "fail"}${c.latency_ms ? ` (${c.latency_ms}ms)` : ""}`}
                    className={`w-1.5 flex-1 rounded-sm ${
                      c.ok ? "bg-emerald-500/70 hover:bg-emerald-500" : "bg-rose-500 hover:bg-rose-600"
                    }`}
                    style={{ height: `${c.ok ? Math.min(100, 30 + (c.latency_ms ?? 50) / 10) : 100}%` }}
                  />
                ))}
            </div>
          )}
        </section>

        {/* Incidents */}
        <section>
          <h3 className="mb-3 text-sm font-black">الحوادث الأخيرة</h3>
          {incidents.isLoading ? (
            <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
          ) : (incidents.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
              لا توجد حوادث مسجلة. كل شيء يعمل بشكل طبيعي ✨
            </div>
          ) : (
            <ul className="space-y-2">
              {(incidents.data ?? []).map((i) => (
                <li key={i.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{i.summary}</p>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-black ${
                      i.severity === "critical" ? "bg-rose-100 text-rose-700" :
                      i.severity === "major" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {i.severity === "critical" ? "حرج" : i.severity === "major" ? "كبير" : "بسيط"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(i.started_at).toLocaleString("ar")}
                    {i.ended_at
                      ? ` — انتهى ${new Date(i.ended_at).toLocaleString("ar")} · المدة: ${durationText(i.started_at, i.ended_at)}`
                      : ` — جارٍ الآن · المدة حتى الآن: ${durationText(i.started_at, null)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* YemenNet help */}
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-black text-sky-900">
            <ShieldAlert className="size-5" /> لا يفتح الموقع لديك من شبكة معينة؟
          </h3>
          <p className="text-sm text-sky-900/80">
            بعض مزودي الإنترنت في اليمن (مثل يمن نت) قد يحجبون أو يبطّئون الوصول لبعض النطاقات.
            جرّب الخطوات التالية:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pr-6 text-sm text-sky-900/90">
            <li className="flex items-start gap-2">
              <Globe2 className="mt-0.5 size-4 shrink-0" />
              <span>غيّر إعدادات DNS لجهازك إلى Cloudflare (<code className="rounded bg-white px-1">1.1.1.1</code>) أو Google (<code className="rounded bg-white px-1">8.8.8.8</code>).</span>
            </li>
            <li className="flex items-start gap-2">
              <Wifi className="mt-0.5 size-4 shrink-0" />
              <span>جرّب فتح الموقع من شبكة جوال 4G بدلاً من Wi-Fi المنزلي.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>استخدم VPN موثوق إن استمرت المشكلة.</span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-sky-900/70">
            لتبليغ مشكلة: واتساب <a className="font-black underline" href="https://wa.me/967774068936">774068936</a>
            {" "}أو هاتف <a className="font-black underline" href="tel:02358921">02358921</a>.
          </p>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/trust" className="hover:text-primary">سياسة الأمان والخصوصية</Link>
          {" · "}
          <Link to="/" className="hover:text-primary">الصفحة الرئيسية</Link>
        </p>
      </main>

      <div className="no-print"><SiteFooter /></div>
    </div>
  );
}
