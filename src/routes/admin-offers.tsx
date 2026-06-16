import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, ArrowRight, Percent } from "lucide-react";
import { listOffers, upsertOffer, deleteOffer } from "@/lib/offers.functions";

export const Route = createFileRoute("/admin-offers")({
  head: () => ({ meta: [{ title: "العروض الترويجية — صيدلية المصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminOffers,
});

type Offer = {
  id: string; title: string; description: string | null;
  discount_percent: number | null; starts_at: string | null; ends_at: string | null;
  is_active: boolean; product_id: string | null;
};

function AdminOffers() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Offer[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Offer> | null>(null);

  const list = useServerFn(listOffers);
  const save = useServerFn(upsertOffer);
  const del = useServerFn(deleteOffer);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows((await list({})) as Offer[]); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [list]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  async function handleSave(o: Partial<Offer>) {
    try {
      await save({ data: {
        id: o.id, title: o.title ?? "", description: o.description ?? "",
        discount_percent: o.discount_percent != null ? Number(o.discount_percent) : null,
        starts_at: o.starts_at || null, ends_at: o.ends_at || null,
        is_active: o.is_active ?? true, product_id: o.product_id || null,
      } as any });
      toast.success("تم الحفظ"); setEditing(null); load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }
  async function handleDelete(id: string) {
    if (!confirm("حذف هذا العرض؟")) return;
    try { await del({ data: { id } }); toast.success("تم الحذف"); load(); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent"><ArrowRight className="size-4" /></Link>
            <h1 className="text-sm font-black">العروض الترويجية</h1>
          </div>
          <button onClick={() => setEditing({})} className="brand-gradient flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground">
            <Plus className="size-4" /> عرض جديد
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-6">
        {busy && <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>}
        {!busy && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">لا توجد عروض بعد.</div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black">{o.title}</h3>
                  {o.description && <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>}
                </div>
                {o.discount_percent != null && (
                  <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">
                    {o.discount_percent}<Percent className="size-3" />
                  </span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {o.starts_at && <>من {new Date(o.starts_at).toLocaleDateString("ar-EG")} </>}
                {o.ends_at && <>إلى {new Date(o.ends_at).toLocaleDateString("ar-EG")}</>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${o.is_active ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>{o.is_active ? "نشط" : "متوقف"}</span>
                <div className="grow" />
                <button onClick={() => setEditing(o)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-accent">تعديل</button>
                <button onClick={() => handleDelete(o.id)} className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" aria-label="حذف"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {editing && <OfferModal initial={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
    </div>
  );
}

function OfferModal({ initial, onClose, onSave }: { initial: Partial<Offer>; onClose: () => void; onSave: (o: Partial<Offer>) => void }) {
  const [o, setO] = useState<Partial<Offer>>({ is_active: true, ...initial });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-3 rounded-3xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black">{o.id ? "تعديل عرض" : "عرض جديد"}</h2>
        <F label="العنوان"><input className="i" value={o.title ?? ""} onChange={(e) => setO({ ...o, title: e.target.value })} /></F>
        <F label="الوصف"><textarea className="i min-h-20" value={o.description ?? ""} onChange={(e) => setO({ ...o, description: e.target.value })} /></F>
        <F label="نسبة الخصم %"><input type="number" min={0} max={100} className="i" value={o.discount_percent ?? ""} onChange={(e) => setO({ ...o, discount_percent: e.target.value ? Number(e.target.value) : null })} /></F>
        <div className="grid grid-cols-2 gap-2">
          <F label="يبدأ من"><input type="date" className="i" value={o.starts_at?.slice(0,10) ?? ""} onChange={(e) => setO({ ...o, starts_at: e.target.value || null })} /></F>
          <F label="ينتهي في"><input type="date" className="i" value={o.ends_at?.slice(0,10) ?? ""} onChange={(e) => setO({ ...o, ends_at: e.target.value || null })} /></F>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={o.is_active ?? true} onChange={(e) => setO({ ...o, is_active: e.target.checked })} /> نشط</label>
        <div className="flex gap-2">
          <button onClick={() => onSave(o)} className="brand-gradient flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-black text-primary-foreground">
            <Save className="size-4" /> حفظ
          </button>
          <button onClick={onClose} className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold">إلغاء</button>
        </div>
        <style>{`.i{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.4);border-radius:.75rem;padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
      </div>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-muted-foreground">{label}</span>{children}</label>;
}
