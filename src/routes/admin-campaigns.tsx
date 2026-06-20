import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Plus, Trash2, Save, HeartPulse } from "lucide-react";
import { listCampaigns, upsertCampaign, deleteCampaign } from "@/lib/campaigns.functions";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin-campaigns")({
  head: () => ({ meta: [{ title: "الحملات الترويجية" }, { name: "robots", content: "noindex" }] }),
  component: () => (<AdminGate><AdminCampaigns /></AdminGate>),
});

type Camp = {
  id?: string; slug: string; name: string; description: string | null;
  condition_tag: string | null; discount_code: string | null;
  eligible_count?: number; redemptions_count?: number; revenue?: number; is_active: boolean;
};

const TAGS = ["diabetes", "blood_pressure", "heart", "thyroid", "cold_flu", "vitamins", "baby_care", "women_care", "first_aid"];

function AdminCampaigns() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Camp[]>([]);
  const [editing, setEditing] = useState<Camp | null>(null);
  const list = useServerFn(listCampaigns);
  const save = useServerFn(upsertCampaign);
  const del = useServerFn(deleteCampaign);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) { window.location.href = "/admin"; return; } setReady(true); }); }, []);

  const refresh = useCallback(async () => {
    try { const d = await list({}); setRows(d as any); } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }, [list]);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  async function commit() {
    if (!editing) return;
    try {
      await save({ data: {
        id: editing.id, slug: editing.slug, name: editing.name,
        description: editing.description || null, condition_tag: editing.condition_tag || null,
        discount_code: editing.discount_code || null, is_active: editing.is_active,
      } });
      toast.success("تم الحفظ"); setEditing(null); refresh();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }
  async function remove(id: string) {
    if (!confirm("حذف الحملة؟")) return;
    try { await del({ data: { id } }); toast.success("تم الحذف"); refresh(); } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const totalRev = rows.reduce((s, c) => s + Number(c.revenue ?? 0), 0);
  const totalRedem = rows.reduce((s, c) => s + Number(c.redemptions_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="flex items-center gap-2 text-base font-black"><HeartPulse className="size-5 text-rose-500" /> الحملات الترويجية</h1>
          <button onClick={() => setEditing({ slug: "", name: "", description: "", condition_tag: "diabetes", discount_code: "CHRONIC10", is_active: true })} className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-2 text-xs font-black text-primary-foreground"><Plus className="size-4" /> حملة جديدة</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="عدد الحملات" value={String(rows.length)} />
          <Kpi label="إجمالي الاستخدامات" value={String(totalRedem)} />
          <Kpi label="إجمالي الإيراد (ر.ي)" value={formatPrice(totalRev)} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-secondary/50 text-xs"><tr>
              <th className="px-3 py-2 text-right">الحملة</th>
              <th className="px-2 py-2">الحالة</th>
              <th className="px-2 py-2">المرض</th>
              <th className="px-2 py-2">الكود</th>
              <th className="px-2 py-2">الاستخدامات</th>
              <th className="px-2 py-2">الإيراد</th>
              <th className="px-2 py-2"></th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2"><div className="font-bold">{c.name}</div><div className="text-[10px] text-muted-foreground">/{c.slug}</div></td>
                  <td className="px-2 py-2 text-center"><span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>{c.is_active ? "نشطة" : "متوقفة"}</span></td>
                  <td className="px-2 py-2 text-center text-xs">{c.condition_tag ?? "—"}</td>
                  <td className="px-2 py-2 text-center text-xs font-black">{c.discount_code ?? "—"}</td>
                  <td className="px-2 py-2 text-center font-black text-primary-deep">{c.redemptions_count ?? 0}</td>
                  <td className="px-2 py-2 text-center font-bold text-emerald-600">{formatPrice(Number(c.revenue ?? 0))} ر.ي</td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={() => setEditing({ ...c })} className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold hover:bg-accent">تعديل</button>
                    <button onClick={() => c.id && remove(c.id)} className="rounded-lg bg-rose-100 p-1.5 text-rose-700"><Trash2 className="size-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">لا توجد حملات بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-elevated">
            <h2 className="mb-3 text-lg font-black">{editing.id ? "تعديل حملة" : "حملة جديدة"}</h2>
            <div className="grid gap-3">
              <Field label="الاسم"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="slug"><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="الوصف"><textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="المرض/التصنيف"><select value={editing.condition_tag ?? ""} onChange={(e) => setEditing({ ...editing, condition_tag: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"><option value="">—</option>{TAGS.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="كود الخصم"><input value={editing.discount_code ?? ""} onChange={(e) => setEditing({ ...editing, discount_code: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> نشطة</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold">إلغاء</button>
              <button onClick={commit} className="flex items-center gap-1 rounded-xl brand-gradient px-4 py-2 text-sm font-black text-primary-foreground"><Save className="size-4" /> حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black text-primary-deep">{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold text-muted-foreground">{label}</span>{children}</label>;
}
