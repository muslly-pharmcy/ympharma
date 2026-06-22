import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/admin/AdminGate";
import { listInventorySyncLogs, type InventorySyncLogRow } from "@/lib/inventory-sync.functions";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin-inventory-sync-logs")({
  component: () => (
    <AdminGate>
      <LogsPage />
    </AdminGate>
  ),
});

function LogsPage() {
  const list = useServerFn(listInventorySyncLogs);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"all" | "success" | "errors">("all");

  const q = useQuery({
    queryKey: ["inventory_sync_logs", from, to, status],
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

  const rows = (q.data ?? []) as InventorySyncLogRow[];
  const totals = useMemo(() => {
    const t = { runs: rows.length, updated: 0, inserted: 0, republished: 0, hidden: 0, errors: 0 };
    for (const r of rows) {
      t.updated += r.details?.updated ?? 0;
      t.inserted += r.details?.inserted ?? 0;
      t.republished += r.details?.republished ?? 0;
      t.hidden += r.details?.hidden ?? 0;
      t.errors += r.details?.errors?.length ?? r.details?.errorCount ?? 0;
    }
    return t;
  }, [rows]);

  function exportCSV() {
    downloadCSV(
      `inventory-sync-logs-${from}_to_${to}.csv`,
      ["التاريخ", "الفعل", "المستخدم", "الإجمالي", "مُحدّث", "مُضاف", "أُعيد نشره", "مُخفي", "أخطاء"],
      rows.map((r) => [
        new Date(r.created_at).toLocaleString("ar"),
        r.action,
        r.actor_email ?? r.actor_id ?? "—",
        r.details?.total ?? "",
        r.details?.updated ?? "",
        r.details?.inserted ?? "",
        r.details?.republished ?? "",
        r.details?.hidden ?? "",
        r.details?.errors?.length ?? r.details?.errorCount ?? 0,
      ]),
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">📜 سجل مزامنة المخزون</h1>
            <p className="text-sm text-muted-foreground">عمليات رفع/مزامنة الإكسيل، مع فلاتر بالتاريخ والحالة.</p>
          </div>
          <a href="/admin-upload-inventory" className="text-xs underline text-primary">رفع جديد →</a>
        </header>

        <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-xs space-y-1">
            <span className="block font-bold">من تاريخ</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5" />
          </label>
          <label className="text-xs space-y-1">
            <span className="block font-bold">إلى تاريخ</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5" />
          </label>
          <label className="text-xs space-y-1">
            <span className="block font-bold">الحالة</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5">
              <option value="all">الكل</option>
              <option value="success">ناجحة (بدون أخطاء)</option>
              <option value="errors">تحتوي أخطاء</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button onClick={() => q.refetch()} className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
              تحديث
            </button>
            <button onClick={exportCSV} disabled={rows.length === 0}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">
              📥 CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <Stat label="عمليات" value={totals.runs} />
          <Stat label="مُحدّث" value={totals.updated} />
          <Stat label="مُضاف" value={totals.inserted} />
          <Stat label="أُعيد نشره" value={totals.republished} />
          <Stat label="مُخفي" value={totals.hidden} />
          <Stat label="أخطاء" value={totals.errors} tone="bad" />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {q.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">⏳ جاري التحميل…</p>
          ) : q.isError ? (
            <p className="p-6 text-sm text-destructive">❌ تعذر تحميل السجل</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد عمليات في الفترة المحددة.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">الفعل</th>
                  <th className="p-2">المستخدم</th>
                  <th className="p-2">الإجمالي</th>
                  <th className="p-2">محدّث</th>
                  <th className="p-2">مُضاف</th>
                  <th className="p-2">أعيد نشره</th>
                  <th className="p-2">مخفي</th>
                  <th className="p-2">أخطاء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const errCount = r.details?.errors?.length ?? r.details?.errorCount ?? 0;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
                      <td className="p-2">{r.action === "inventory_sync_finalize" ? "إنهاء" : "دفعة"}</td>
                      <td className="p-2">{r.actor_email ?? (r.actor_id ? r.actor_id.slice(0, 8) : "—")}</td>
                      <td className="p-2 tabular-nums">{r.details?.total ?? "—"}</td>
                      <td className="p-2 tabular-nums">{r.details?.updated ?? "—"}</td>
                      <td className="p-2 tabular-nums">{r.details?.inserted ?? "—"}</td>
                      <td className="p-2 tabular-nums">{r.details?.republished ?? "—"}</td>
                      <td className="p-2 tabular-nums">{r.details?.hidden ?? "—"}</td>
                      <td className={`p-2 tabular-nums ${errCount > 0 ? "text-destructive font-bold" : ""}`}>{errCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
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
