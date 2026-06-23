import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/admin/AdminGate";
import { getFinancialSummary, exportSalesCsv } from "@/lib/invoicing.functions";
import { Download, RefreshCw, TrendingUp, ShoppingBag, Wallet, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-sales-reports")({
  component: () => <AdminGate><Page /></AdminGate>,
});

function Page() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchSummary = useServerFn(getFinancialSummary);
  const fetchCsv = useServerFn(exportSalesCsv);

  const q = useQuery({
    queryKey: ["sales-summary", month, year],
    queryFn: () => fetchSummary({ data: { month, year } }),
  });

  const handleExport = async () => {
    try {
      const { csv, filename } = await fetchCsv({ data: { startDate, endDate } });
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير التقرير");
    } catch (e) {
      toast.error("فشل التصدير: " + (e instanceof Error ? e.message : "خطأ"));
    }
  };

  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const s = q.data;

  return (
    <div className="min-h-screen bg-background px-4 py-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-foreground">📊 تقارير المبيعات</h1>
          <button onClick={() => q.refetch()} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-accent">
            <RefreshCw className="size-4" /> تحديث
          </button>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
              الشهر
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
              السنة
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={<TrendingUp className="size-5" />} label="إجمالي المبيعات" value={s ? `${s.grossSales.toLocaleString("ar")} ر.ي` : "—"} loading={q.isLoading} />
          <KpiCard icon={<ShoppingBag className="size-5" />} label="عدد الطلبات" value={s ? String(s.ordersCount) : "—"} loading={q.isLoading} />
          <KpiCard icon={<Wallet className="size-5" />} label="صافي الإيرادات" value={s ? `${s.netRevenue.toLocaleString("ar")} ر.ي` : "—"} loading={q.isLoading} accent="text-emerald-600" />
          <KpiCard icon={<Ban className="size-5" />} label="قيمة الملغي" value={s ? `${s.cancelledValue.toLocaleString("ar")} ر.ي` : "—"} loading={q.isLoading} accent="text-rose-600" />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-black">📥 تصدير المبيعات (CSV)</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
              من تاريخ
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
              إلى تاريخ
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <button onClick={handleExport}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground hover:opacity-90">
              <Download className="size-4" /> تصدير CSV
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">يفتح مباشرة في Excel مع دعم العربية (UTF-8 BOM).</p>
        </section>

        {q.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            تعذر تحميل الملخص: {(q.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, loading, accent }: { icon: React.ReactNode; label: string; value: string; loading?: boolean; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-black ${accent ?? "text-foreground"}`}>
        {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" /> : value}
      </div>
    </div>
  );
}
