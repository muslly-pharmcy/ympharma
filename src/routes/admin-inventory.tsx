import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ArrowRight, AlertTriangle, PackageX, CalendarClock, Wallet, Search, Save,
} from "lucide-react";
import { fetchInventoryReport, listInventoryRows, updateInventory } from "@/lib/inventory.functions";
import { InventoryAlerts } from "@/components/admin/InventoryAlerts";

export const Route = createFileRoute("/admin-inventory")({
  head: () => ({ meta: [{ title: "إدارة المخزون — صيدلية المصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><AdminInventory /></AdminGate>),
});

type Row = {
  id: string; legacy_id: number; name: string; brand: string | null; price: number;
  stock_qty: number; reorder_point: number; expiry_date: string | null;
  supplier_name: string | null; supplier_cost: number | null;
  track_stock: boolean; is_published: boolean;
};

type Report = Awaited<ReturnType<typeof fetchInventoryReport>>;

function AdminInventory() {
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyOut, setOnlyOut] = useState(false);
  const [onlyTracked, setOnlyTracked] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});

  const loadReport = useServerFn(fetchInventoryReport);
  const loadRows = useServerFn(listInventoryRows);
  const save = useServerFn(updateInventory);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [rep, list] = await Promise.all([
        loadReport({}),
        loadRows({ data: { search: search || undefined, onlyLow: onlyLow || onlyOut, onlyTracked, limit: 300 } }),
      ]);
      setReport(rep);
      let result = list as Row[];
      if (onlyOut) result = result.filter((r) => (r.stock_qty ?? 0) <= 0);
      setRows(result);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [loadReport, loadRows, search, onlyLow, onlyOut, onlyTracked]);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  function setEdit(id: string, patch: Partial<Row>) {
    setEdits((p) => ({ ...p, [id]: { ...(p[id] ?? {}), ...patch } }));
  }

  async function commit(row: Row) {
    const e = edits[row.id];
    if (!e) return;
    try {
      await save({ data: { id: row.id, ...e } as any });
      toast.success(`تم الحفظ: ${row.name}`);
      setEdits((p) => { const c = { ...p }; delete c[row.id]; return c; });
      setRows((p) => p.map((r) => (r.id === row.id ? { ...r, ...e } as Row : r)));
    } catch (err: any) { toast.error(String(err?.message ?? err)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="text-base font-black">إدارة المخزون</h1>
          <div className="flex items-center gap-2">
            <Link to="/admin-inventory-duplicates" className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">المتشابهات + إضافة بالجملة</Link>
            <button onClick={refresh} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <InventoryAlerts />

        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <button type="button" onClick={() => { setOnlyLow(true); setOnlyOut(false); }} className="text-right">
            <Kpi icon={<AlertTriangle className="size-4 text-amber-500" />} label="مخزون منخفض" value={report?.low_stock?.length ?? 0} active={onlyLow && !onlyOut} />
          </button>
          <button type="button" onClick={() => { setOnlyOut(true); setOnlyLow(false); }} className="text-right">
            <Kpi icon={<PackageX className="size-4 text-rose-500" />} label="النواقص (نفد المخزون)" value={report?.out_of_stock?.length ?? 0} active={onlyOut} />
          </button>
          <Kpi icon={<CalendarClock className="size-4 text-orange-500" />} label="قارب على الانتهاء (90 يوم)" value={report?.near_expiry?.length ?? 0} />
          <Kpi icon={<Wallet className="size-4 text-emerald-500" />} label="قيمة المخزون (ر.ي)" value={(report?.inventory_value ?? 0).toLocaleString("ar-EG")} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="ابحث باسم الصنف..." className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 pr-9 text-sm outline-none focus:border-primary" />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={onlyLow} onChange={(e) => { setOnlyLow(e.target.checked); if (e.target.checked) setOnlyOut(false); }} /> منخفضة فقط</label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={onlyOut} onChange={(e) => { setOnlyOut(e.target.checked); if (e.target.checked) setOnlyLow(false); }} /> النواقص فقط</label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={onlyTracked} onChange={(e) => setOnlyTracked(e.target.checked)} /> ذات تتبع مخزون</label>
          <button onClick={refresh} disabled={busy} className="rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">تطبيق</button>
        </div>

        {/* Editable table */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-secondary/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-right">الصنف</th>
                <th className="px-2 py-2">تتبع</th>
                <th className="px-2 py-2">المخزون</th>
                <th className="px-2 py-2">نقطة الطلب</th>
                <th className="px-2 py-2">تاريخ الانتهاء</th>
                <th className="px-2 py-2">المورد</th>
                <th className="px-2 py-2">تكلفة المورد</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">{busy ? "جارٍ التحميل..." : "لا توجد نتائج"}</td></tr>
              )}
              {rows.map((r) => {
                const e = edits[r.id] ?? {};
                const merged = { ...r, ...e };
                const dirty = !!edits[r.id];
                const isLow = merged.track_stock && merged.stock_qty <= merged.reorder_point;
                return (
                  <tr key={r.id} className={`border-t border-border ${isLow ? "bg-amber-50/40" : ""}`}>
                    <td className="px-3 py-2">
                      <div className="font-bold leading-tight">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground">{r.brand} · #{r.legacy_id}</div>
                    </td>
                    <td className="px-2 py-2 text-center"><input type="checkbox" checked={!!merged.track_stock} onChange={(ev) => setEdit(r.id, { track_stock: ev.target.checked })} /></td>
                    <td className="px-2 py-2"><Num value={merged.stock_qty} onChange={(v) => setEdit(r.id, { stock_qty: v })} /></td>
                    <td className="px-2 py-2"><Num value={merged.reorder_point} onChange={(v) => setEdit(r.id, { reorder_point: v })} /></td>
                    <td className="px-2 py-2"><input type="date" value={merged.expiry_date ?? ""} onChange={(ev) => setEdit(r.id, { expiry_date: ev.target.value || null })} className="w-32 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs" /></td>
                    <td className="px-2 py-2"><input value={merged.supplier_name ?? ""} onChange={(ev) => setEdit(r.id, { supplier_name: ev.target.value || null })} className="w-32 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs" /></td>
                    <td className="px-2 py-2"><Num value={merged.supplier_cost ?? 0} onChange={(v) => setEdit(r.id, { supplier_cost: v || null })} step={0.01} /></td>
                    <td className="px-2 py-2">
                      <button onClick={() => commit(r)} disabled={!dirty} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-black text-white disabled:opacity-40"><Save className="size-3" /> حفظ</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Num({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-20 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-center" />;
}

function Kpi({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: number | string; active?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-card p-3 ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}
