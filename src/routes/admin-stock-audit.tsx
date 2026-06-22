// Admin: stock +10 audit page — shows before/after per product after the
// bulk `UPDATE products SET stock_qty = stock_qty + 10` migration.
// "Before" is derived as (current - 10) since the bump was uniform.
// Read-only. Authenticated route under the admin gate is preferred but this
// page just renders public columns (id/name/stock_qty) so the data itself
// is not sensitive — gated only by the existing AdminGate wrapper.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, PackageCheck, Search } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AdminGate } from "@/components/admin/AdminGate";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/admin-stock-audit")({
  head: () => ({
    meta: [
      { title: "تدقيق إضافة +10 وحدات — الإدارة" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <StockAuditPage />
    </AdminGate>
  ),
});

type Row = { id: string; name: string; stock_qty: number | null; track_stock: boolean | null; category: string | null };

const BUMP = 10;

function StockAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_qty, track_stock, category")
        .order("name", { ascending: true });
      if (!alive) return;
      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.name?.toLowerCase().includes(t) || r.category?.toLowerCase().includes(t));
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const tracked = rows.filter((r) => r.track_stock).length;
    const after = rows.reduce((s, r) => s + (r.stock_qty ?? 0), 0);
    const before = after - total * BUMP;
    return { total, tracked, before, after, added: total * BUMP };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <PackageCheck className="size-7 text-primary" /> تدقيق تحديث المخزون (+{BUMP} لكل منتج)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مقارنة قيمة <code className="rounded bg-secondary px-1">stock_qty</code> قبل وبعد الزيادة الموحّدة. القيمة "قبل" مُستنتَجة (after − {BUMP}).
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="إجمالي المنتجات" value={stats.total} />
          <Stat label="track_stock مُفعّل" value={stats.tracked} />
          <Stat label="المجموع قبل" value={stats.before} />
          <Stat label="المجموع بعد" value={stats.after} accent />
        </section>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المنتج أو الفئة..."
              className="w-full rounded-2xl border border-border bg-secondary/60 ps-4 pe-10 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => {
              const headers = ["id", "name", "category", "before", "delta", "after", "track_stock"];
              const data = filtered.map((r) => {
                const after = r.stock_qty ?? 0;
                return [r.id, r.name, r.category ?? "", after - BUMP, BUMP, after, r.track_stock ? "true" : "false"];
              });
              const date = new Date().toISOString().slice(0, 10);
              downloadCSV(`stock-audit-${date}.csv`, headers, data);
            }}
            disabled={loading || filtered.length === 0}
            className="brand-gradient inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            <Download className="size-4" /> تصدير CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">خطأ: {error}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs">
                <tr className="text-start">
                  <th className="px-3 py-2 text-start">المنتج</th>
                  <th className="px-3 py-2 text-start">الفئة</th>
                  <th className="px-3 py-2 text-center">قبل</th>
                  <th className="px-3 py-2 text-center">الفرق</th>
                  <th className="px-3 py-2 text-center">بعد</th>
                  <th className="px-3 py-2 text-center">track_stock</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const after = r.stock_qty ?? 0;
                  const before = after - BUMP;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-bold">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.category ?? "—"}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{before}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">+{BUMP}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-black text-primary-deep">{after}</td>
                      <td className="px-3 py-2 text-center">
                        {r.track_stock ? <span className="text-emerald-600">✓</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-4 ${accent ? "brand-gradient text-primary-foreground" : "bg-card"}`}>
      <p className={`text-xs ${accent ? "opacity-90" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value.toLocaleString("ar-EG")}</p>
    </div>
  );
}
