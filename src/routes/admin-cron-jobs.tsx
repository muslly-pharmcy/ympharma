// Admin dashboard for scheduled cron jobs (marketing automation, Path 3).
// Reads cron.job + cron.job_run_details via admin-only SECURITY DEFINER RPCs.
// Shows last run / status / duration per job and lets admins trigger a run manually.
import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, CheckCircle2, AlertTriangle, Play, RefreshCcw, Clock } from "lucide-react";

export const Route = createFileRoute("/admin-cron-jobs")({
  head: () => ({
    meta: [
      { title: "المهام المجدولة — صيدلية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Job = { jobid: number; jobname: string; schedule: string; command: string; active: boolean };
type Run = {
  jobid: number;
  runid: number;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
  jobname: string | null;
};

const HOOKS: Record<string, string> = {
  "reactivation-campaign": "/api/public/hooks/run-reactivation",
  "loyalty-reminder-campaign": "/api/public/hooks/run-loyalty-reminder",
  "restock-alerts": "/api/public/hooks/run-restock-alerts",
};

function Page() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    const [j, r] = await Promise.all([
      supabase.rpc("admin_list_cron_jobs" as never),
      supabase.rpc("admin_list_cron_runs" as never, { _limit: 100 } as never),
    ]);
    setBusy(false);
    if (j.error) toast.error("تعذر جلب المهام: " + j.error.message);
    else setJobs((j.data ?? []) as Job[]);
    if (r.error) toast.error("تعذر جلب السجل: " + r.error.message);
    else setRuns((r.data ?? []) as Run[]);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const runNow = async (jobname: string) => {
    const hook = HOOKS[jobname];
    if (!hook) return toast.error("لا يوجد رابط تشغيل لهذه المهمة");
    setRunning(jobname);
    try {
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: "{}",
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`${res.status}: ${txt}`);
      toast.success(`تم تشغيل ${jobname}`);
      setTimeout(load, 1500);
    } catch (e) {
      toast.error("فشل التشغيل: " + (e as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const lastRunFor = (jobid: number) => runs.find((r) => r.jobid === jobid);
  const failed24h = runs.filter((r) => r.status === "failed" && Date.now() - new Date(r.start_time).getTime() < 86400000).length;
  const ok24h = runs.filter((r) => r.status === "succeeded" && Date.now() - new Date(r.start_time).getTime() < 86400000).length;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-black">
            <Activity className="size-5" /> المهام المجدولة — الأتمتة التسويقية
          </h1>
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black">
            <RefreshCcw className={`size-3 ${busy ? "animate-spin" : ""}`} /> تحديث
          </button>
        </header>

        <section className="mb-4 grid gap-2 sm:grid-cols-3">
          <Stat label="مهام مجدولة" value={jobs.length} tone="indigo" />
          <Stat label="نجاح/24س" value={ok24h} tone="emerald" />
          <Stat label="فشل/24س" value={failed24h} tone="rose" />
        </section>

        <section className="mb-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted text-xs">
              <tr>
                <th className="px-3 py-2">المهمة</th>
                <th className="px-3 py-2">الجدولة</th>
                <th className="px-3 py-2">آخر تشغيل</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">المدة</th>
                <th className="px-3 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">لا توجد مهام مجدولة بعد.</td></tr>
              )}
              {jobs.map((j) => {
                const lr = lastRunFor(j.jobid);
                const duration = lr?.end_time && lr?.start_time
                  ? Math.round((new Date(lr.end_time).getTime() - new Date(lr.start_time).getTime()) / 100) / 10 + "ث"
                  : "—";
                return (
                  <tr key={j.jobid} className="border-t border-border">
                    <td className="px-3 py-2 font-bold">{j.jobname}</td>
                    <td className="px-3 py-2 font-mono text-xs">{j.schedule}</td>
                    <td className="px-3 py-2 text-xs">
                      {lr ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(lr.start_time).toLocaleString("ar")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {lr ? <StatusBadge status={lr.status} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{duration}</td>
                    <td className="px-3 py-2">
                      {HOOKS[j.jobname] ? (
                        <button
                          onClick={() => runNow(j.jobname)}
                          disabled={running === j.jobname}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-black text-primary-foreground disabled:opacity-50"
                        >
                          <Play className="size-3" /> {running === j.jobname ? "..." : "تشغيل الآن"}
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-black">سجل التشغيل (آخر 50)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1.5">المهمة</th>
                  <th className="px-2 py-1.5">التاريخ</th>
                  <th className="px-2 py-1.5">الحالة</th>
                  <th className="px-2 py-1.5">الرسالة</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 50).map((r) => (
                  <tr key={r.runid} className="border-t border-border">
                    <td className="px-2 py-1.5 font-bold">{r.jobname ?? r.jobid}</td>
                    <td className="px-2 py-1.5">{new Date(r.start_time).toLocaleString("ar")}</td>
                    <td className="px-2 py-1.5"><StatusBadge status={r.status} /></td>
                    <td className="px-2 py-1.5 max-w-xs truncate" title={r.return_message ?? ""}>
                      {r.return_message ?? "—"}
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">لا يوجد سجل بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "indigo" | "emerald" | "rose" }) {
  const cls = {
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="text-[11px] font-bold opacity-80">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "succeeded") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-900">
      <CheckCircle2 className="size-3" /> نجحت
    </span>
  );
  if (status === "failed") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-900">
      <AlertTriangle className="size-3" /> فشلت
    </span>
  );
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">{status}</span>;
}
