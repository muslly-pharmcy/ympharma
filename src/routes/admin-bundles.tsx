import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Plus, Trash2, Save, Package2 } from "lucide-react";
import { listBundlesAdmin, upsertBundle, deleteBundle } from "@/lib/bundles.functions";

export const Route = createFileRoute("/admin-bundles")({
  head: () => ({ meta: [{ title: "إدارة الباقات" }, { name: "robots", content: "noindex" }] }),
  component: AdminBundles,
});

type Item = { product_legacy_id: number; qty: number };
type Bundle = {
  id?: string; slug: string; name: string; description: string | null; image_url: string | null;
  kind: string; discount_percent: number; fixed_price: number | null;
  is_active: boolean; sort_order: number; sales_count?: number; revenue?: number;
  bundle_items?: { product_legacy_id: number; qty: number }[];
  items?: Item[];
};

function AdminBundles() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Bundle[]>([]);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useServerFn(listBundlesAdmin);
  const save = useServerFn(upsertBundle);
  const del = useServerFn(deleteBundle);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) { window.location.href = "/admin"; return; } setReady(true); });
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const data = await list({});
      setRows((data as any[]).map((b) => ({ ...b, items: (b.bundle_items ?? []).map((bi: any) => ({ product_legacy_id: bi.product_legacy_id, qty: bi.qty })) })));
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [list]);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  function startNew() {
    setEditing({ slug: "", name: "", description: "", image_url: "", kind: "general", discount_percent: 10, fixed_price: null, is_active: true, sort_order: 100, items: [] });
  }
  function startEdit(b: Bundle) { setEditing({ ...b }); }

  async function commit() {
    if (!editing) return;
    try {
      await save({ data: {
        id: editing.id, slug: editing.slug, name: editing.name,
        description: editing.description || null, image_url: editing.image_url || null,
        kind: editing.kind || "general", discount_percent: Number(editing.discount_percent) || 0,
        fixed_price: editing.fixed_price != null && editing.fixed_price !== ("" as any) ? Number(editing.fixed_price) : null,
        is_active: editing.is_active, sort_order: Number(editing.sort_order) || 100,
        items: (editing.items ?? []).filter((i) => i.product_legacy_id > 0 && i.qty > 0),
      } as any });
      toast.success("تم الحفظ");
      setEditing(null); refresh();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  async function remove(id: string) {
    if (!confirm("حذف الباقة؟")) return;
    try { await del({ data: { id } }); toast.success("تم الحذف"); refresh(); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="flex items-center gap-2 text-base font-black"><Package2 className="size-5 text-emerald-500" /> إدارة الباقات</h1>
          <button onClick={startNew} className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-2 text-xs font-black text-primary-foreground"><Plus className="size-4" /> باقة جديدة</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black">{b.name}</h3>
                  <p className="text-[11px] text-muted-foreground">/{b.slug} · {b.kind}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                  {b.is_active ? "نشط" : "متوقف"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                <Stat label="خصم" value={`${b.discount_percent}%`} />
                <Stat label="مبيعات" value={String(b.sales_count ?? 0)} />
                <Stat label="عناصر" value={String((b as any).items_count ?? b.items?.length ?? 0)} />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(b)} className="flex-1 rounded-lg bg-secondary py-1.5 text-xs font-bold hover:bg-accent">تعديل</button>
                <button onClick={() => b.id && remove(b.id)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
          {rows.length === 0 && !busy && <p className="col-span-full rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد باقات بعد.</p>}
        </div>
      </main>

      {editing && <BundleEditor value={editing} onChange={setEditing} onCancel={() => setEditing(null)} onSave={commit} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/50 p-1.5"><div className="font-black text-primary-deep">{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>;
}

function BundleEditor({ value, onChange, onCancel, onSave }: { value: Bundle; onChange: (b: Bundle) => void; onCancel: () => void; onSave: () => void }) {
  function setI(i: number, patch: Partial<Item>) {
    const items = [...(value.items ?? [])];
    items[i] = { ...items[i], ...patch } as Item;
    onChange({ ...value, items });
  }
  function addItem() { onChange({ ...value, items: [...(value.items ?? []), { product_legacy_id: 0, qty: 1 }] }); }
  function removeItem(i: number) { const items = [...(value.items ?? [])]; items.splice(i, 1); onChange({ ...value, items }); }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-elevated">
        <h2 className="mb-3 text-lg font-black">{value.id ? "تعديل باقة" : "باقة جديدة"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم"><input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="slug"><input value={value.slug} onChange={(e) => onChange({ ...value, slug: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="النوع"><input value={value.kind} onChange={(e) => onChange({ ...value, kind: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="خصم %"><input type="number" value={value.discount_percent} onChange={(e) => onChange({ ...value, discount_percent: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="سعر ثابت (اختياري)"><input type="number" value={value.fixed_price ?? ""} onChange={(e) => onChange({ ...value, fixed_price: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="ترتيب"><input type="number" value={value.sort_order} onChange={(e) => onChange({ ...value, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="رابط الصورة" className="sm:col-span-2"><input value={value.image_url ?? ""} onChange={(e) => onChange({ ...value, image_url: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
          <Field label="الوصف" className="sm:col-span-2"><textarea value={value.description ?? ""} onChange={(e) => onChange({ ...value, description: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" rows={2} /></Field>
          <label className="flex items-center gap-2 text-xs font-bold sm:col-span-2"><input type="checkbox" checked={value.is_active} onChange={(e) => onChange({ ...value, is_active: e.target.checked })} /> نشطة</label>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black">منتجات الباقة</h3>
            <button onClick={addItem} className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-bold"><Plus className="size-3.5" /> أضف</button>
          </div>
          <div className="space-y-1.5">
            {(value.items ?? []).map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" placeholder="رقم المنتج (legacy id)" value={it.product_legacy_id || ""} onChange={(e) => setI(i, { product_legacy_id: Number(e.target.value) })} className="flex-1 rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-xs" />
                <input type="number" placeholder="كمية" value={it.qty || 1} onChange={(e) => setI(i, { qty: Number(e.target.value) })} className="w-20 rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-xs" />
                <button onClick={() => removeItem(i)} className="rounded-lg bg-rose-100 p-1.5 text-rose-700"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
            {(value.items ?? []).length === 0 && <p className="text-xs text-muted-foreground">لا توجد منتجات. أضف رقم المنتج (legacy id) من صفحة الأصناف.</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold">إلغاء</button>
          <button onClick={onSave} className="flex items-center gap-1 rounded-xl brand-gradient px-4 py-2 text-sm font-black text-primary-foreground"><Save className="size-4" /> حفظ</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-[11px] font-bold text-muted-foreground">{label}</span>{children}</label>;
}
