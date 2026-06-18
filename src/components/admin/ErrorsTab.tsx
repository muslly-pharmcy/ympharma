import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

type ErrorRow = {
  id: string;
  occurred_at: string;
  level: string;
  source: string;
  message: string;
  url: string | null;
  user_agent: string | null;
  country: string | null;
  stack: string | null;
};

export function ErrorsTab() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "client" | "server">("all");

  async function load() {
    setBusy(true);
    let q = supabase
      .from("error_logs")
      .select("id,occurred_at,level,source,message,url,user_agent,country,stack")
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("source", filter);
    const { data } = await q;
    setRows((data ?? []) as ErrorRow[]);
    setBusy(false);
  }

  useEffect(() => { void load(); }, [filter]);

  async function clearOlderThan(days: number) {
    if (!confirm(`حذف السجلات الأقدم من ${days} يوماً؟`)) return;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    await supabase.from("error_logs").delete().lt("occurred_at", cutoff);
    void load();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <AlertTriangle className="size-5 text-amber-600" /> سجلات الأخطاء
        </h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
            <option value="all">الكل</option>
            <option value="client">العميل (المتصفح)</option>
            <option value="server">الخادم</option>
          </select>
          <button onClick={load} disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button onClick={() => clearOlderThan(7)}
            className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-600">
            <Trash2 className="size-3.5" /> حذف &gt; 7 أيام
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          لا توجد أخطاء مسجلة.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-black ${
                  r.level === "error" ? "bg-rose-100 text-rose-700" :
                  r.level === "warn" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-700"
                }`}>{r.level}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold">{r.source}</span>
                {r.country && <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-bold">{r.country}</span>}
                <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.occurred_at).toLocaleString("ar")}</span>
              </div>
              <p className="mt-2 break-words font-bold">{r.message}</p>
              {r.url && <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">{r.url}</p>}
              {r.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-primary">عرض stack trace</summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-100" dir="ltr">{r.stack}</pre>
                </details>
              )}
              {r.user_agent && <p className="mt-1 truncate text-[10px] text-muted-foreground" dir="ltr" title={r.user_agent}>{r.user_agent}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
