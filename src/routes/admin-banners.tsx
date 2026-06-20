import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Plus, Trash2, Save, Megaphone, MousePointerClick, Eye } from "lucide-react";
import { listBannersAdmin, upsertBanner, deleteBanner } from "@/lib/banners.functions";

export const Route = createFileRoute("/admin-banners")({
  head: () => ({ meta: [{ title: "البانرات التسويقية" }, { name: "robots", content: "noindex" }] }),
  component: () => (<AdminGate><AdminBanners /></AdminGate>),
});

const THEMES = ["gradient-emerald", "gradient-rose", "gradient-amber", "gradient-indigo", "solid-card"];

type Banner = {
  id?: string; title: string; subtitle: string | null; cta_label: string | null; cta_href: string | null;
  theme: string; image_url: string | null; placement: string; is_active: boolean; sort_order: number;
  expires_at: string | null; impressions?: number; clicks?: number;
};

function AdminBanners() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const list = useServerFn(listBannersAdmin);
  const save = useServerFn(upsertBanner);
  const del = useServerFn(deleteBanner);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) { window.location.href = "/admin"; return; } setReady(true); }); }, []);

  const refresh = useCallback(async () => {
    try { const d = await list({}); setRows(d as any); } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }, [list]);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  function startNew() {
    setEditing({ title: "", subtitle: "", cta_label: "اطلب الآن", cta_href: "/products", theme: "gradient-emerald", image_url: "", placement: "home", is_active: true, sort_order: 100, expires_at: null });
  }
  async function commit() {
    if (!editing) return;
    try {
      await save({ data: {
        id: editing.id, title: editing.title, subtitle: editing.subtitle || null,
        cta_label: editing.cta_label || null, cta_href: editing.cta_href || null,
        theme: editing.theme, image_url: editing.image_url || null,
        placement: editing.placement || "home", is_active: editing.is_active,
        sort_order: Number(editing.sort_order) || 100,
        expires_at: editing.expires_at || null,
      } });
      toast.success("تم الحفظ"); setEditing(null); refresh();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }
  async function remove(id: string) {
    if (!confirm("حذف البانر؟")) return;
    try { await del({ data: { id } }); toast.success("تم الحذف"); refresh(); } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="flex items-center gap-2 text-base font-black"><Megaphone className="size-5 text-rose-500" /> البانرات التسويقية</h1>
          <button onClick={startNew} className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-2 text-xs font-black text-primary-foreground"><Plus className="size-4" /> بانر جديد</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-6">
        {rows.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black">{b.title}</h3>
                {b.subtitle && <p className="line-clamp-1 text-xs text-muted-foreground">{b.subtitle}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{b.placement} · {b.theme} · ترتيب {b.sort_order}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold"><Eye className="size-3" /> {b.impressions ?? 0}</span>
                <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold"><MousePointerClick className="size-3" /> {b.clicks ?? 0}</span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>{b.is_active ? "نشط" : "متوقف"}</span>
                <button onClick={() => setEditing({ ...b })} className="rounded-lg bg-secondary px-3 py-1 text-xs font-bold hover:bg-accent">تعديل</button>
                <button onClick={() => b.id && remove(b.id)} className="rounded-lg bg-rose-100 p-1.5 text-rose-700"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد بانرات.</p>}
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-elevated">
            <h2 className="mb-3 text-lg font-black">{editing.id ? "تعديل بانر" : "بانر جديد"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="العنوان" className="sm:col-span-2"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="العنوان الفرعي" className="sm:col-span-2"><textarea value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="نص الزر"><input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="رابط الزر"><input value={editing.cta_href ?? ""} onChange={(e) => setEditing({ ...editing, cta_href: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="الموقع"><select value={editing.placement} onChange={(e) => setEditing({ ...editing, placement: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"><option value="home">الرئيسية</option><option value="dashboard">لوحة الإدارة</option><option value="cart">السلة</option></select></Field>
              <Field label="الثيم"><select value={editing.theme} onChange={(e) => setEditing({ ...editing, theme: e.target.value })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{THEMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="ترتيب"><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <Field label="تاريخ انتهاء (اختياري)"><input type="datetime-local" value={editing.expires_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm" /></Field>
              <label className="flex items-center gap-2 text-xs font-bold sm:col-span-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> نشط</label>
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-[11px] font-bold text-muted-foreground">{label}</span>{children}</label>;
}
