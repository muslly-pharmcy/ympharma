import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listAgentRuns } from "@/lib/pharmacy-intel-admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-agents")({
  head: () => ({
    meta: [
      { title: "سجل الوكلاء — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgentsPage,
});

type AgentRun = {
  id: string;
  agent: string;
  kind: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: string | null;
  details: Record<string, unknown>;
  impact_estimate: number | null;
  confidence: number | null;
};

function AgentsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const get = useServerFn(listAgentRuns);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get({ data: { limit: 200 } });
      setRuns(r as AgentRun[]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر التحميل"); }
    finally { setLoading(false); }
  }, [get]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (authed === false) {
    return <div className="grid min-h-screen place-items-center"><Link to="/admin" className="text-primary underline">يلزم تسجيل الدخول</Link></div>;
  }
  if (authed === null || loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">سجل الوكلاء الذكيين</h1>
            <p className="text-xs text-muted-foreground">كل تشغيل ليلي + تشغيل يدوي للمحرك</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent"><RefreshCw className="size-4" /></button>
            <Link to="/admin-command" className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent"><ArrowLeft className="size-4 rotate-180" /></Link>
          </div>
        </header>

        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            لا توجد تشغيلات بعد. ستبدأ تلقائياً عند الساعة 02:30 صباحاً، أو يمكن تشغيلها يدوياً من غرفة القيادة.
          </div>
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex size-2 rounded-full ${r.status === "ok" ? "bg-emerald-500" : r.status === "running" ? "bg-amber-500" : "bg-rose-500"}`} />
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">{r.agent}</span>
                    <span className="text-xs text-muted-foreground">{r.kind}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.started_at).toLocaleString("ar")}</span>
                </div>
                {r.summary && <p className="mt-2 text-sm">{r.summary}</p>}
                {r.details && Object.keys(r.details).length > 0 && (
                  <pre dir="ltr" className="mt-2 max-h-40 overflow-auto rounded-xl bg-secondary/40 p-2 text-[10px] text-muted-foreground">{JSON.stringify(r.details, null, 2)}</pre>
                )}
                {(r.impact_estimate != null || r.confidence != null) && (
                  <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">
                    {r.impact_estimate != null && <span>أثر متوقع: {new Intl.NumberFormat("ar-EG").format(Math.round(r.impact_estimate))} ر.ي</span>}
                    {r.confidence != null && <span>ثقة: {r.confidence}%</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
