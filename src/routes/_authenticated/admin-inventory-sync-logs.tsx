import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/admin/AdminGate";
import { listInventorySyncRuns, type InventorySyncRun } from "@/lib/inventory-sync.functions";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin-inventory-sync-logs")({
  component: () => (
    <AdminGate>
      <LogsPage />
    </AdminGate>
  ),
});

const STATUS_TONE: Record<InventorySyncRun["status"], string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  running: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function LogsPage() {
  const list = useServerFn(listInventorySyncRuns);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"all" | "completed" | "failed" | "cancelled">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["inventory_sync_runs", from, to, status],
    queryFn: () =>
      list({
        data: {
          from: from ? new Date(from + "T00:00:00").toISOString() : undefined,
          to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
          status,
          limit: 200,
        },
      }),
  });

  const rows = (q.data ?? []) as InventorySyncRun[];
  const totals = useMemo(() => {
    const t = { runs: rows.length, updated: 0, inserted: 0, republished: 0, hidden: 0, errors: 0, failed: 0 };
    for (const r of rows) {
      t.updated += r.updated;
      t.inserted += r.inserted;
      t.republished += r.republished;
      t.hidden += r.hidden;
      t.errors += r.errors?.length ?? 0;
      if (r.status === "failed") t.failed++;
    }
    return t;
  }, [rows]);

  function exportCSV() {
    downloadCSV(
      `inventory-sync-runs-${from}_to_${to}.csv`,
      ["البداية", "الحالة", "الإجمالي", "مُحدّث", "مُضاف", "أُعيد نشره", "مُخفي", "أخطاء"],
      rows.map((r) => [
        new Date(r.started_at).toLocaleString("ar"),
        r.status,
        r.total_products,
        r.updated,
        r.inserted,
        r.republished,
        r.hidden,
        r.errors?.length ?? 0,
      ]),
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">📜 سجل تشغيل المزامنة</h1>
            <p className="text-sm text-muted-foreground">عملية واحدة لكل سطر — افتح أي سطر لرؤية المنتجات المحدثة/المضافة/المخفية.</p>
          </div>
          <a href="/admin-upload-inventory" className="text-xs underline text-primary">رفع جديد →</a>
        </header>

        <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-xs space-y-1">
            <span className="block font-bold">من تاريخ</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5" />
          </label>
          <label className="text-xs space-y-1">
            <span className="block font-bold">إلى تاريخ</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5" />
          </label>
          <label className="text-xs space-y-1">
            <span className="block font-bold">الحالة</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full rounded-md border border-border bg-background px-2 py-1.5">
              <option value="all">الكل</option>
              <option value="completed">ناجحة</option>
              <option value="failed">فشلت</option>
              <option value="cancelled">ألغيت</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button onClick={() => q.refetch()} className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
              تحديث
            </button>
            <button onClick={exportCSV} disabled={rows.length === 0} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">
              📥 CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs">
          <Stat label="عمليات" value={totals.runs} />
          <Stat label="فشلت" value={totals.failed} tone={totals.failed > 0 ? "bad" : undefined} />
          <Stat label="مُحدّث" value={totals.updated} />
          <Stat label="مُضاف" value={totals.inserted} />
          <Stat label="أُعيد نشره" value={totals.republished} />
          <Stat label="مُخفي" value={totals.hidden} />
          <Stat label="أخطاء" value={totals.errors} tone={totals.errors > 0 ? "bad" : undefined} />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {q.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">⏳ جاري التحميل…</p>
          ) : q.isError ? (
            <p className="p-6 text-sm text-destructive">❌ تعذر تحميل السجل</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد عمليات في الفترة المحددة.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                const meta = (r.metadata ?? {}) as Record<string, unknown>;
                const updatedIds = Array.isArray(meta.updatedIds) ? (meta.updatedIds as number[]) : [];
                const insertedIds = Array.isArray(meta.insertedIds) ? (meta.insertedIds as number[]) : [];
                const hiddenIds = Array.isArray(meta.hiddenIds) ? (meta.hiddenIds as string[]) : [];
                const failureReason = typeof meta.failureReason === "string" ? meta.failureReason : null;
                return (
                  <li key={r.id} className="text-xs">
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[r.status]}`}>
                          {r.status}
                        </span>
                        <span className="truncate">{new Date(r.started_at).toLocaleString("ar")}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {r.total_products} • ♻️ {r.updated} • 🆕 {r.inserted} • 🙈 {r.hidden}
                        {r.errors?.length > 0 && <span className="text-destructive font-bold"> • ⚠️ {r.errors.length}</span>}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 bg-background/50">
                        {failureReason && (
                          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                            <b>سبب الفشل:</b> {failureReason}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <IdList title={`مُحدّث (${updatedIds.length})`} ids={updatedIds.map(String)} />
                          <IdList title={`مُضاف (${insertedIds.length})`} ids={insertedIds.map(String)} />
                          <IdList title={`مُخفي (${hiddenIds.length})`} ids={hiddenIds} />
                        </div>
                        {r.errors.length > 0 && (
                          <details className="rounded-lg border border-border p-2">
                            <summary className="cursor-pointer font-bold">أخطاء ({r.errors.length})</summary>
                            <ul className="mt-1 max-h-48 overflow-auto space-y-0.5 font-mono">
                              {r.errors.slice(0, 200).map((e, i) => <li key={i} className="text-destructive">{e}</li>)}
                            </ul>
                          </details>
                        )}
                        <details className="rounded-lg border border-border p-2">
                          <summary className="cursor-pointer font-bold">Metadata الخام</summary>
                          <pre className="mt-1 max-h-40 overflow-auto text-[10px]">{JSON.stringify(meta, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function IdList({ title, ids }: { title: string; ids: string[] }) {
  if (ids.length === 0) return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="font-bold">{title}</div>
      <div className="text-muted-foreground">—</div>
    </div>
  );
  return (
    <details className="rounded-lg border border-border bg-card p-2">
      <summary className="cursor-pointer font-bold">{title}</summary>
      <div className="mt-1 max-h-40 overflow-auto font-mono text-[10px] break-all">
        {ids.slice(0, 500).join(", ")}
        {ids.length > 500 && <span className="text-muted-foreground"> … (+{ids.length - 500})</span>}
      </div>
    </details>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3 ${tone === "bad" && value > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-lg font-black tabular-nums">{value.toLocaleString("ar")}</div>
    </div>
  );
}
