import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Search, Download, AlertCircle } from "lucide-react";
import { listTriggerFailures } from "@/lib/inventory-duplicates.functions";

export const Route = createFileRoute("/admin-trigger-failures")({
  head: () => ({ meta: [{ title: "أحداث فشل Trigger — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Row = {
  id: string; trigger_name: string; status: string;
  duration_ms: number | null; error_message: string | null;
  payload: any; created_at: string;
};

function Page() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [hours, setHours] = useState(24);
  const fn = useServerFn(listTriggerFailures);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await fn({ data: { search: search || undefined, hours, limit: 1000 } }) as Row[]); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [fn, search, hours]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Client-side facets after fetch
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (batchFilter && String(r.payload?.batch_id ?? "").toLowerCase().indexOf(batchFilter.toLowerCase()) < 0) return false;
      if (reasonFilter && String(r.payload?.reason ?? "").toLowerCase().indexOf(reasonFilter.toLowerCase()) < 0) return false;
      return true;
    });
  }, [rows, batchFilter, reasonFilter]);

  function exportCSV() {
    const headers = ["created_at", "trigger_name", "duration_ms", "error_message", "reason", "batch_id", "product_id", "source"];
    const lines = [headers.join(",")];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    for (const r of filtered) {
      lines.push([
        r.created_at, r.trigger_name, r.duration_ms ?? "", r.error_message ?? "",
        r.payload?.reason ?? "", r.payload?.batch_id ?? "", r.payload?.product_id ?? "", r.payload?.source ?? "",
      ].map(esc).join(","));
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `trigger-failures-${Date.now()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin-inventory-duplicates" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="text-base font-black">أحداث فشل Trigger</h1>
          <button onClick={load} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-bold">
            بحث في رسالة الخطأ
            <div className="relative">
              <Search className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} className="w-full rounded-lg border border-border bg-secondary/40 px-2 py-2 pr-7 text-xs" placeholder="كلمة مفتاحية" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            batch_id (تصفية فورية)
            <input value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="rounded-lg border border-border bg-secondary/40 px-2 py-2 text-xs font-mono" placeholder="batch id" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            app.adjust_reason (تصفية فورية)
            <input value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="rounded-lg border border-border bg-secondary/40 px-2 py-2 text-xs" placeholder="استلام شحنة..." />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            النافذة الزمنية (ساعات)
            <input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="rounded-lg border border-border bg-secondary/40 px-2 py-2 text-xs" />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-500" /> {filtered.length} حدث (من أصل {rows.length}) خلال آخر {hours} ساعة
          </div>
          <button onClick={exportCSV} disabled={filtered.length === 0} className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-black disabled:opacity-40"><Download className="size-4" /> CSV</button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-secondary/40">
              <tr>
                <th className="px-2 py-2 text-right">الوقت</th>
                <th className="px-2 py-2 text-right">Trigger</th>
                <th className="px-2 py-2">المدة (ms)</th>
                <th className="px-2 py-2 text-right">رسالة الخطأ</th>
                <th className="px-2 py-2 text-right">السبب</th>
                <th className="px-2 py-2 text-right">المنتج</th>
                <th className="px-2 py-2">المصدر</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{busy ? "جارٍ التحميل..." : "لا توجد أحداث فشل ✅"}</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-2 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                  <td className="px-2 py-2 font-mono">{r.trigger_name}</td>
                  <td className="px-2 py-2 text-center">{r.duration_ms ?? "—"}</td>
                  <td className="px-2 py-2 text-rose-600">{r.error_message ?? "—"}</td>
                  <td className="px-2 py-2">{r.payload?.reason ?? "—"}</td>
                  <td className="px-2 py-2 font-mono text-[10px]">{r.payload?.product_id ? String(r.payload.product_id).slice(0, 8) : "—"}</td>
                  <td className="px-2 py-2 text-center">{r.payload?.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
