import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ArrowRight, Copy, PackagePlus, Eye, AlertTriangle, Save,
  Download, History, Undo2, Activity,
} from "lucide-react";
import {
  listDuplicateProducts, linkSuppliersBatch, rollbackSupplierBatch, listSupplierBatches,
  previewBulkAddStock, applyBulkAddStock, triggerHealth,
  type DuplicateGroup,
} from "@/lib/inventory-duplicates.functions";

export const Route = createFileRoute("/admin-inventory-duplicates")({
  head: () => ({ meta: [{ title: "المنتجات المتشابهة وعمليات المخزون — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Tab = "duplicates" | "bulk" | "history" | "health";

function Page() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("duplicates");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin-inventory" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="text-base font-black">المتشابهات + المخزون + الموردين</h1>
          <div />
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 pb-2">
          <TabBtn active={tab === "duplicates"} onClick={() => setTab("duplicates")} icon={<Copy className="size-4" />} label="المتشابهات" />
          <TabBtn active={tab === "bulk"} onClick={() => setTab("bulk")} icon={<PackagePlus className="size-4" />} label="إضافة بالجملة" />
          <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<History className="size-4" />} label="سجل الموردين + Rollback" />
          <TabBtn active={tab === "health"} onClick={() => setTab("health")} icon={<Activity className="size-4" />} label="صحة الـ Trigger" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {tab === "duplicates" && <DuplicatesTab />}
        {tab === "bulk" && <BulkTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "health" && <HealthTab />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${active ? "brand-gradient text-primary-foreground" : "bg-secondary hover:bg-accent"}`}>
      {icon}{label}
    </button>
  );
}

// ============== Duplicates Tab ==============

type ItemEdit = { supplier_name?: string; supplier_cost?: number | null };

function DuplicatesTab() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("توحيد مورد للمنتجات المتشابهة");
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});
  const fetchFn = useServerFn(listDuplicateProducts);
  const link = useServerFn(linkSuppliersBatch);

  const load = useCallback(async () => {
    setBusy(true);
    try { setGroups(await fetchFn({})); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  function setItem(id: string, patch: ItemEdit) {
    setEdits((p) => ({ ...p, [id]: { ...(p[id] ?? {}), ...patch } }));
  }

  async function unify(g: DuplicateGroup) {
    // Use the first non-empty supplier name typed in this group
    const groupEdits = g.items
      .map((i) => ({ id: i.id, supplier_name: edits[i.id]?.supplier_name?.trim() }))
      .filter((x) => x.supplier_name);
    if (groupEdits.length === 0) { toast.error("اكتب اسم مورد لصنف واحد على الأقل"); return; }
    // Use the first typed name as the unified value
    const supplier_name = groupEdits[0].supplier_name!;
    if (!reason.trim()) { toast.error("اكتب سبب التعديل"); return; }
    try {
      const items = g.items.map((i) => ({
        id: i.id,
        supplier_name,
        supplier_cost: edits[i.id]?.supplier_cost ?? undefined,
      }));
      const res = await link({ data: { items, reason: reason.trim() } });
      toast.success(`تم ربط ${res.applied}/${res.count} صنف (batch: ${res.batch_id.slice(0, 8)})`);
      setEdits({});
      await load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{busy ? "جارٍ التحميل..." : `${groups.length} مجموعة بأسماء + جرعات متطابقة`}</div>
        <div className="flex items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب التعديل" className="w-64 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-xs" />
          <button onClick={load} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
        </div>
      </div>
      {groups.length === 0 && !busy && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد مجموعات متشابهة (الجرعات المختلفة لا تُدمج).</div>
      )}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-black">{g.display_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {g.count} أصناف · إجمالي المخزون {g.total_stock}
                  {g.dosages.length > 0 && <> · الجرعة: <span className="font-bold">{g.dosages.join(", ")}</span></>}
                </div>
              </div>
              <button onClick={() => unify(g)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white"><Save className="size-3" /> ربط جميع الأصناف بأول مورد مُدخل</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[800px] text-xs">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-2 py-1 text-right">الصنف</th>
                    <th className="px-2 py-1">السعر</th>
                    <th className="px-2 py-1">المخزون</th>
                    <th className="px-2 py-1">المورد الحالي</th>
                    <th className="px-2 py-1">المورد الجديد</th>
                    <th className="px-2 py-1">التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-2 py-1">{i.name} <span className="text-[10px] text-muted-foreground">#{i.legacy_id}</span></td>
                      <td className="px-2 py-1 text-center">{Number(i.price).toLocaleString("ar-EG")}</td>
                      <td className="px-2 py-1 text-center">{i.stock_qty}</td>
                      <td className="px-2 py-1 text-center">{i.supplier_name ?? "—"}</td>
                      <td className="px-2 py-1"><input value={edits[i.id]?.supplier_name ?? ""} onChange={(e) => setItem(i.id, { supplier_name: e.target.value })} placeholder={i.supplier_name ?? "اسم المورد"} className="w-32 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs" /></td>
                      <td className="px-2 py-1"><input type="number" step={0.01} value={edits[i.id]?.supplier_cost ?? i.supplier_cost ?? 0} onChange={(e) => setItem(i.id, { supplier_cost: Number(e.target.value) })} className="w-20 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-center" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== Bulk Tab ==============

function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCSV(name: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function BulkTab() {
  const [delta, setDelta] = useState(5);
  const [scope, setScope] = useState<"published" | "tracked" | "out_of_stock">("published");
  const [reason, setReason] = useState("استلام شحنة");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBulkAddStock>> | null>(null);
  const [busy, setBusy] = useState(false);
  const previewFn = useServerFn(previewBulkAddStock);
  const applyFn = useServerFn(applyBulkAddStock);

  async function runPreview() {
    setBusy(true);
    try { setPreview(await previewFn({ data: { delta, scope, reason } })); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function runApply() {
    if (!preview) return;
    if (!reason.trim()) { toast.error("اكتب سبب التعديل"); return; }
    if (!confirm(`تأكيد: سيتم تعديل ${preview.count} صنف بإضافة ${delta}. هل تريد المتابعة؟`)) return;
    setBusy(true);
    try {
      const res = await applyFn({ data: { delta, scope, reason: reason.trim(), confirm: true } });
      toast.success(`تم تطبيق التعديل على ${res.applied}/${res.count} صنف`);
      setPreview(null);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  function exportCSV(stage: "preview" | "after") {
    if (!preview) return;
    const csv = toCSV(preview.rows.map((r) => ({
      legacy_id: r.legacy_id ?? "",
      name: r.name,
      supplier_name: r.supplier_name ?? "",
      before_qty: r.before_qty,
      after_qty: r.after_qty,
      delta: r.after_qty - r.before_qty,
      reason: r.reason,
      stage,
    })));
    downloadCSV(`bulk-stock-${stage}-${Date.now()}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-bold">
            مقدار الإضافة (delta)
            <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="rounded-lg border border-border bg-secondary/40 px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            النطاق
            <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="rounded-lg border border-border bg-secondary/40 px-2 py-2">
              <option value="published">كل الأصناف المنشورة</option>
              <option value="tracked">ذات تتبع مخزون فقط</option>
              <option value="out_of_stock">النواقص فقط (≤ 0)</option>
            </select>
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-xs font-bold">
            سبب التعديل (يُسجَّل في سجل التدقيق)
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-border bg-secondary/40 px-2 py-2" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={runPreview} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-black disabled:opacity-50"><Eye className="size-4" /> معاينة فقط</button>
          <button onClick={runApply} disabled={busy || !preview} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Save className="size-4" /> تطبيق</button>
          {preview && (
            <>
              <button onClick={() => exportCSV("preview")} className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-black"><Download className="size-4" /> CSV قبل</button>
              <button onClick={() => exportCSV("after")} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-black disabled:opacity-40"><Download className="size-4" /> CSV بعد</button>
            </>
          )}
          {!preview && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle className="size-3" /> يجب المعاينة أولاً</span>}
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="عدد المنتجات" value={preview.count} />
            <Stat label="إجمالي قبل" value={preview.total_before} />
            <Stat label="إجمالي بعد" value={preview.total_after} />
            <Stat label="الفرق" value={preview.total_after - preview.total_before} />
          </div>
          <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[800px] text-xs">
              <thead className="sticky top-0 bg-secondary/80 backdrop-blur"><tr><th className="px-2 py-1 text-right">#</th><th className="px-2 py-1 text-right">الصنف</th><th className="px-2 py-1">المورد</th><th className="px-2 py-1">قبل</th><th className="px-2 py-1">بعد</th><th className="px-2 py-1">الفرق</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1 text-center text-muted-foreground">{r.legacy_id ?? "—"}</td>
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 text-center">{r.supplier_name ?? "—"}</td>
                    <td className="px-2 py-1 text-center">{r.before_qty}</td>
                    <td className="px-2 py-1 text-center font-bold">{r.after_qty}</td>
                    <td className="px-2 py-1 text-center text-emerald-600">{r.after_qty - r.before_qty >= 0 ? "+" : ""}{r.after_qty - r.before_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== History Tab (supplier link rollback) ==============

function HistoryTab() {
  const [rows, setRows] = useState<Array<{ batch_id: string; reason: string; count: number; rolled_back: number; created_at: string }>>([]);
  const [busy, setBusy] = useState(false);
  const listFn = useServerFn(listSupplierBatches);
  const rb = useServerFn(rollbackSupplierBatch);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows(await listFn({}) as any); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [listFn]);
  useEffect(() => { load(); }, [load]);

  async function rollback(batch_id: string) {
    if (!confirm(`تأكيد استرجاع جميع الأصناف في هذه العملية إلى موردها السابق؟`)) return;
    try {
      const res = await rb({ data: { batch_id } });
      toast.success(`تم استرجاع ${res.restored}/${res.total} صنف`);
      await load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{busy ? "جارٍ التحميل..." : `${rows.length} عملية ربط مورد`}</div>
        <button onClick={load} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-xs">
          <thead className="bg-secondary/40"><tr><th className="px-2 py-2 text-right">التاريخ</th><th className="px-2 py-2 text-right">السبب</th><th className="px-2 py-2">عدد الأصناف</th><th className="px-2 py-2">مُسترجَع</th><th className="px-2 py-2">معرف العملية</th><th className="px-2 py-2">إجراء</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد عمليات</td></tr>}
            {rows.map((r) => (
              <tr key={r.batch_id} className="border-t border-border">
                <td className="px-2 py-2">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                <td className="px-2 py-2">{r.reason ?? "—"}</td>
                <td className="px-2 py-2 text-center">{r.count}</td>
                <td className="px-2 py-2 text-center">{r.rolled_back}/{r.count}</td>
                <td className="px-2 py-2 text-center font-mono text-[10px]">{r.batch_id.slice(0, 12)}</td>
                <td className="px-2 py-2 text-center">
                  <button disabled={r.rolled_back >= r.count} onClick={() => rollback(r.batch_id)} className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-40"><Undo2 className="size-3" /> rollback</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== Health Tab ==============

function HealthTab() {
  const [h, setH] = useState<Awaited<ReturnType<typeof triggerHealth>> | null>(null);
  const [busy, setBusy] = useState(false);
  const fn = useServerFn(triggerHealth);

  const load = useCallback(async () => {
    setBusy(true);
    try { setH(await fn({})); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [fn]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">صحة Trigger خلال آخر 24 ساعة</div>
        <button onClick={load} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
      </div>
      {h && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="إجمالي التنفيذات" value={h.total} />
            <Stat label="ناجح" value={h.ok} />
            <Stat label="فاشل" value={h.failed} />
            <Stat label="متوسط الزمن (ms)" value={Math.round(h.avg_duration_ms * 100) / 100} />
          </div>
          {h.failed > 0 && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-3">
              <div className="text-xs font-black text-rose-600">آخر الأخطاء</div>
              <ul className="mt-2 space-y-1 text-[11px]">
                {h.last_failures.map((f: any, i: number) => (
                  <li key={i} className="font-mono">{new Date(f.created_at).toLocaleString("ar-EG")} — {f.error_message ?? "—"}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            معدل الفشل: <span className="font-black">{(h.failure_rate * 100).toFixed(2)}%</span> ·
            عند تجاوز 5 فشلات خلال 5 دقائق يُولَّد تنبيه تلقائي في <code>staff_alerts</code>.
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black">{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}
