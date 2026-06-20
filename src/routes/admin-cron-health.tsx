// Phase 7 — Lightweight cron healthcheck for prescription-extract-worker
// Uses prescription_extractions activity as a proxy for cron health:
//   last_run     = most recent extraction row's updated/created timestamp
//   last_status  = its status (done/review/failed/processing/pending)
//   recent_errors = failed rows in the last hour
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin-cron-health")({
  head: () => ({
    meta: [
      { title: "صحة المهام المجدولة — صيدلية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Summary = {
  lastRun: string | null;
  lastStatus: string | null;
  pending: number;
  processing: number;
  doneLastHour: number;
  failedLastHour: number;
  recentErrors: Array<{ id: string; prescription_id: string; error: string | null; created_at: string }>;
};

function Page() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [latest, pend, proc, done, failed, errs] = await Promise.all([
      supabase.from("prescription_extractions")
        .select("status, updated_at, created_at")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("prescription_extractions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("prescription_extractions").select("id", { count: "exact", head: true }).eq("status", "processing"),
      supabase.from("prescription_extractions").select("id", { count: "exact", head: true }).eq("status", "done").gte("updated_at", oneHourAgo),
      supabase.from("prescription_extractions").select("id", { count: "exact", head: true }).eq("status", "failed").gte("updated_at", oneHourAgo),
      supabase.from("prescription_extractions")
        .select("id, prescription_id, error, created_at")
        .eq("status", "failed")
        .order("updated_at", { ascending: false }).limit(10),
    ]);
    setBusy(false);
    setSummary({
      lastRun: latest.data?.updated_at ?? latest.data?.created_at ?? null,
      lastStatus: latest.data?.status ?? null,
      pending: pend.count ?? 0,
      processing: proc.count ?? 0,
      doneLastHour: done.count ?? 0,
      failedLastHour: failed.count ?? 0,
      recentErrors: (errs.data ?? []) as Summary["recentErrors"],
    });
  };
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  const stale = summary?.lastRun
    ? (Date.now() - new Date(summary.lastRun).getTime()) > 5 * 60 * 1000
    : false;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-black">
            <Activity className="size-5" /> صحة المهام المجدولة — prescription-extract-worker
          </h1>
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-black">
            <RefreshCcw className={`size-3 ${busy ? "animate-spin" : ""}`} /> تحديث
          </button>
        </header>

        {!summary ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm">جارٍ التحميل…</p>
        ) : (
          <>
            <section className={`mb-3 rounded-2xl border p-4 ${
              stale ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"
            }`}>
              <div className="flex items-center gap-2 text-sm font-black">
                {stale ? <AlertTriangle className="size-4 text-rose-700" /> : <CheckCircle2 className="size-4 text-emerald-700" />}
                <span className={stale ? "text-rose-900" : "text-emerald-900"}>
                  {stale ? "تحذير: لم تُسجَّل أي معالجة في آخر 5 دقائق" : "العامل نشط"}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-1">
                  <Clock className="size-3" /> آخر تشغيل:{" "}
                  {summary.lastRun ? new Date(summary.lastRun).toLocaleString("ar") : "—"}
                </div>
                <div>آخر حالة: <span className="font-black">{summary.lastStatus ?? "—"}</span></div>
              </div>
            </section>

            <section className="mb-3 grid gap-2 sm:grid-cols-4">
              <Card label="معلّق" value={summary.pending} tone="amber" />
              <Card label="قيد المعالجة" value={summary.processing} tone="indigo" />
              <Card label="مكتمل/ساعة" value={summary.doneLastHour} tone="emerald" />
              <Card label="فشل/ساعة" value={summary.failedLastHour} tone="rose" />
            </section>

            <section className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-black">آخر الأخطاء</h2>
                <Link to="/admin-ai-extraction-failures" className="text-xs font-bold text-primary">
                  عرض كل الأعطال →
                </Link>
              </div>
              <ul className="space-y-2 text-xs">
                {summary.recentErrors.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px]">{e.prescription_id}</span>
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("ar")}</span>
                    </div>
                    {e.error && (
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-rose-50 p-1 text-[11px] text-rose-900">
                        {e.error}
                      </pre>
                    )}
                  </li>
                ))}
                {summary.recentErrors.length === 0 && (
                  <li className="text-muted-foreground">لا توجد أخطاء حديثة.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone: "amber" | "indigo" | "emerald" | "rose" }) {
  const toneCls = {
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="text-[11px] font-bold opacity-80">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
