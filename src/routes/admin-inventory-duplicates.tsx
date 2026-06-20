import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Copy, PackagePlus, Eye, AlertTriangle, Save } from "lucide-react";
import {
  listDuplicateProducts, unifySupplier, previewBulkAddStock, applyBulkAddStock,
  type DuplicateGroup,
} from "@/lib/inventory-duplicates.functions";

export const Route = createFileRoute("/admin-inventory-duplicates")({
  head: () => ({ meta: [{ title: "المنتجات المتشابهة وعمليات المخزون — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Tab = "duplicates" | "bulk";

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
          <h1 className="text-base font-black">المنتجات المتشابهة + المخزون</h1>
          <div />
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
          <TabBtn active={tab === "duplicates"} onClick={() => setTab("duplicates")} icon={<Copy className="size-4" />} label="المتشابهات" />
          <TabBtn active={tab === "bulk"} onClick={() => setTab("bulk")} icon={<PackagePlus className="size-4" />} label="إضافة كميات بالجملة" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {tab === "duplicates" ? <DuplicatesTab /> : <BulkTab />}
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

function DuplicatesTab() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [supplier, setSupplier] = useState<Record<string, string>>({});
  const fetchFn = useServerFn(listDuplicateProducts);
  const unify = useServerFn(unifySupplier);

  const load = useCallback(async () => {
    setBusy(true);
    try { setGroups(await fetchFn({})); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  async function applyUnify(g: DuplicateGroup) {
    const name = (supplier[g.key] ?? "").trim();
    if (!name) { toast.error("اكتب اسم المورد أولاً"); return; }
    try {
      const res = await unify({ data: { ids: g.items.map((i) => i.id), supplier_name: name } });
      toast.success(`تم توحيد المورد لـ ${res.updated} صنف`);
      await load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{busy ? "جارٍ التحميل..." : `${groups.length} مجموعة بأسماء متشابهة`}</div>
        <button onClick={load} disabled={busy} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "..." : "تحديث"}</button>
      </div>
      {groups.length === 0 && !busy && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد منتجات متشابهة الأسماء.</div>
      )}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-black">{g.display_name}</div>
                <div className="text-[11px] text-muted-foreground">{g.count} أصناف · إجمالي المخزون {g.total_stock}</div>
              </div>
              <div className="flex items-center gap-2">
                <input value={supplier[g.key] ?? ""} onChange={(e) => setSupplier((p) => ({ ...p, [g.key]: e.target.value }))} placeholder="اسم المورد الموحَّد" className="w-48 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-xs" />
                <button onClick={() => applyUnify(g)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white"><Save className="size-3" /> دمج بالمورد</button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-secondary/40">
                  <tr><th className="px-2 py-1 text-right">الصنف</th><th className="px-2 py-1">العلامة</th><th className="px-2 py-1">السعر</th><th className="px-2 py-1">المخزون</th><th className="px-2 py-1">المورد الحالي</th><th className="px-2 py-1">منشور</th></tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-2 py-1">{i.name} <span className="text-[10px] text-muted-foreground">#{i.legacy_id}</span></td>
                      <td className="px-2 py-1 text-center">{i.brand ?? "—"}</td>
                      <td className="px-2 py-1 text-center">{Number(i.price).toLocaleString("ar-EG")}</td>
                      <td className="px-2 py-1 text-center">{i.stock_qty}</td>
                      <td className="px-2 py-1 text-center">{i.supplier_name ?? "—"}</td>
                      <td className="px-2 py-1 text-center">{i.is_published ? "✓" : "—"}</td>
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
    try { setPreview(await previewFn({ data: { delta, scope } })); }
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
          <button onClick={runPreview} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-black disabled:opacity-50"><Eye className="size-4" /> معاينة فقط (بدون تعديل)</button>
          <button onClick={runApply} disabled={busy || !preview} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Save className="size-4" /> تطبيق التعديل</button>
          {!preview && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle className="size-3" /> يجب المعاينة أولاً قبل التطبيق</span>}
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="عدد المنتجات المتأثرة" value={preview.count} />
            <Stat label="إجمالي المخزون قبل" value={preview.total_before} />
            <Stat label="إجمالي المخزون بعد" value={preview.total_after} />
            <Stat label="الفرق المتوقع" value={preview.total_after - preview.total_before} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="bg-secondary/40"><tr><th className="px-2 py-1 text-right">الصنف</th><th className="px-2 py-1">قبل</th><th className="px-2 py-1">بعد</th><th className="px-2 py-1">الفرق</th></tr></thead>
              <tbody>
                {preview.sample.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 text-center">{r.stock_qty}</td>
                    <td className="px-2 py-1 text-center font-bold">{r.after_qty}</td>
                    <td className="px-2 py-1 text-center text-emerald-600">+{r.after_qty - r.stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.count > preview.sample.length && (
              <div className="border-t border-border bg-secondary/30 px-2 py-1 text-center text-[10px] text-muted-foreground">
                عرض أول {preview.sample.length} من أصل {preview.count}
              </div>
            )}
          </div>
        </div>
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
