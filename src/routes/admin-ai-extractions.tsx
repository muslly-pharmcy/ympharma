// Phase 7 — Admin viewer for AI prescription extractions
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { runExtraction, runPendingBatch } from "@/lib/prescription-extractor.functions";
import { toast } from "sonner";
import { ArrowRight, Brain, Loader2, RefreshCcw, Play, Search } from "lucide-react";

export const Route = createFileRoute("/admin-ai-extractions")({
  head: () => ({ meta: [{ title: "استخراج AI للروشتات — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Status = "pending" | "processing" | "done" | "review" | "failed";

type Row = {
  id: string;
  prescription_file_id: string;
  prescription_id: string;
  source_type: "prescription" | "insurance";
  status: Status;
  model_tier: "flash" | "pro";
  model_used: string | null;
  attempts: number;
  confidence: number | null;
  medications: Array<{ name: string; dose?: string | null; duration?: string | null }>;
  doctor_name: string | null;
  prescription_date: string | null;
  diagnosis: string | null;
  allergies: string[];
  interactions: string[];
  error: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "معلّق", processing: "قيد التحليل", done: "تم", review: "بحاجة مراجعة", failed: "فشل",
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const runOne = useServerFn(runExtraction);
  const runBatch = useServerFn(runPendingBatch);

  const load = async () => {
    setBusy(true);
    let query = supabase
      .from("prescription_extractions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.prescription_id, r.doctor_name, r.diagnosis, r.model_used, r.error]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(t))
      || JSON.stringify(r.medications ?? []).toLowerCase().includes(t)
    );
  }, [rows, q]);

  const kpi = useMemo(() => {
    const t = { total: rows.length, done: 0, review: 0, failed: 0, pending: 0, processing: 0, confSum: 0, confCount: 0 };
    for (const r of rows) {
      t[r.status]++;
      if (r.confidence != null) { t.confSum += Number(r.confidence); t.confCount++; }
    }
    const avgConf = t.confCount ? Math.round(t.confSum / t.confCount) : 0;
    const autoRate = t.total ? Math.round((t.done / t.total) * 100) : 0;
    return { ...t, avgConf, autoRate };
  }, [rows]);

  const onRunOne = async (id: string) => {
    setActing(id);
    try {
      const res = await runOne({ data: { extraction_id: id } });
      toast.success(`${STATUS_LABEL[res.status as Status]} — ثقة ${res.confidence}%`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل التحليل"); }
    finally { setActing(null); }
  };

  const onRunBatch = async () => {
    setBusy(true);
    try {
      const res = await runBatch({ data: { limit: 5 } });
      toast.success(`تمت معالجة ${res.processed} روشتات`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل التشغيل"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" /> الإدارة
          </Link>
          <div className="flex gap-2">
            <button onClick={onRunBatch} disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              <Play className="size-3" /> تشغيل دفعة (5)
            </button>
            <button onClick={load}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />} تحديث
            </button>
          </div>
        </div>

        <header className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Brain className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black">استخراج AI للروشتات — Phase 7</h1>
              <p className="text-xs text-white/85">Flash → Pro عند الحاجة. عتبة المراجعة 80%</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/20 px-2 py-1">إجمالي: {kpi.total}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">تم: {kpi.done}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">مراجعة: {kpi.review}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">فشل: {kpi.failed}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">متوسط الثقة: {kpi.avgConf}%</span>
            <span className="rounded-full bg-white/20 px-2 py-1">نسبة الأتمتة: {kpi.autoRate}%</span>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["all", "pending", "processing", "done", "review", "failed"] as const).map(k => (
            <button key={k} onClick={() => setStatus(k)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${status === k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              {k === "all" ? "الكل" : STATUS_LABEL[k]}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث: رقم روشتة، طبيب، دواء…"
              className="w-64 rounded-lg border border-border bg-background px-7 py-1.5 text-xs" />
          </div>
        </div>

        <section className="space-y-3">
          {filtered.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">{r.source_type === "insurance" ? "تأمين" : "روشتة"}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${
                  r.status === "done" ? "bg-emerald-100 text-emerald-800" :
                  r.status === "review" ? "bg-amber-100 text-amber-800" :
                  r.status === "failed" ? "bg-rose-100 text-rose-800" :
                  r.status === "processing" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700"
                }`}>{STATUS_LABEL[r.status]}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">{r.model_tier}</span>
                {r.confidence != null && <span className="rounded-full bg-secondary px-2 py-0.5">ثقة {r.confidence}%</span>}
                <span className="rounded-full bg-secondary px-2 py-0.5 font-mono">{r.prescription_id}</span>
                <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
              </div>
              {r.medications?.length ? (
                <ul className="mb-2 list-disc space-y-0.5 pr-5 text-xs">
                  {r.medications.slice(0, 8).map((m, i) => (
                    <li key={i}><b>{m.name}</b>{m.dose ? ` — ${m.dose}` : ""}{m.duration ? ` (${m.duration})` : ""}</li>
                  ))}
                </ul>
              ) : null}
              {(r.doctor_name || r.prescription_date || r.diagnosis) && (
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {r.doctor_name && <>طبيب: <b>{r.doctor_name}</b> · </>}
                  {r.prescription_date && <>تاريخ: {r.prescription_date} · </>}
                  {r.diagnosis && <>تشخيص: {r.diagnosis}</>}
                </p>
              )}
              {r.error && <p className="mb-2 text-[11px] text-rose-700">⚠ {r.error}</p>}
              <div className="flex gap-2">
                <button disabled={acting === r.id} onClick={() => onRunOne(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
                  {acting === r.id ? <Loader2 className="size-3 animate-spin" /> : <Brain className="size-3" />}
                  {r.status === "done" ? "إعادة التحليل" : "تحليل الآن"}
                </button>
              </div>
            </article>
          ))}
          {!filtered.length && !busy && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد عمليات استخراج.</p>
          )}
        </section>
      </main>
    </div>
  );
}
