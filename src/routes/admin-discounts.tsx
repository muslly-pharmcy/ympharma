import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Plus, Trash2, Save, X, Tag } from "lucide-react";
import { listDiscountCodes, upsertDiscountCode, deleteDiscountCode, discountRedemptionReport } from "@/lib/discounts.functions";

export const Route = createFileRoute("/admin-discounts")({
  head: () => ({ meta: [{ title: "أكواد الخصم — صيدلية المصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><AdminDiscounts /></AdminGate>),
});

type Code = {
  id: string; code: string; kind: "percent" | "flat" | "free_shipping";
  value: number; min_total: number; max_uses: number | null; uses: number;
  first_order_only: boolean; starts_at: string; expires_at: string | null; active: boolean;
};

function AdminDiscounts() {
  const [ready, setReady] = useState(false);
  const [codes, setCodes] = useState<Code[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Code> | null>(null);

  const list = useServerFn(listDiscountCodes);
  const save = useServerFn(upsertDiscountCode);
  const del = useServerFn(deleteDiscountCode);
  const reports = useServerFn(discountRedemptionReport);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [c, r] = await Promise.all([list({}), reports({})]);
      setCodes(c as Code[]); setRedemptions(r as any[]);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [list, reports]);
  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  async function handleSave() {
    if (!editing) return;
    try {
      await save({ data: {
        id: editing.id,
        code: (editing.code ?? "").trim().toUpperCase(),
        kind: editing.kind ?? "percent",
        value: Number(editing.value) || 0,
        min_total: Number(editing.min_total) || 0,
        max_uses: editing.max_uses ? Number(editing.max_uses) : null,
        first_order_only: !!editing.first_order_only,
        expires_at: editing.expires_at || null,
        active: editing.active ?? true,
      } as any });
      toast.success("تم حفظ الكود");
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }
  async function handleDel(id: string) {
    if (!confirm("حذف الكود نهائياً؟")) return;
    try { await del({ data: { id } }); refresh(); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-4" /> رجوع</Link>
          <h1 className="text-base font-black flex items-center gap-2"><Tag className="size-4" /> أكواد الخصم</h1>
          <button onClick={() => setEditing({ kind: "percent", value: 10, min_total: 0, active: true, first_order_only: false })} className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-2 text-xs font-black text-primary-foreground"><Plus className="size-4" /> كود جديد</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-secondary/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-right">الكود</th>
                <th className="px-2 py-2">النوع</th>
                <th className="px-2 py-2">القيمة</th>
                <th className="px-2 py-2">حد أدنى</th>
                <th className="px-2 py-2">استخدامات</th>
                <th className="px-2 py-2">ينتهي</th>
                <th className="px-2 py-2">نشط</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">{busy ? "..." : "لا توجد أكواد بعد"}</td></tr>}
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-black tracking-wider">{c.code}</td>
                  <td className="px-2 py-2 text-xs">{c.kind === "percent" ? "نسبة %" : c.kind === "flat" ? "خصم ثابت" : "شحن مجاني"}</td>
                  <td className="px-2 py-2 text-center">{c.kind === "percent" ? `${c.value}%` : c.value.toLocaleString("ar-EG")}</td>
                  <td className="px-2 py-2 text-center text-xs">{c.min_total.toLocaleString("ar-EG")}</td>
                  <td className="px-2 py-2 text-center text-xs">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-2 py-2 text-center text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar-EG") : "—"}</td>
                  <td className="px-2 py-2 text-center">{c.active ? <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">نعم</span> : <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">لا</span>}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(c)} className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-bold">تعديل</button>
                      <button onClick={() => handleDel(c.id)} className="grid size-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Redemptions */}
        <section>
          <h2 className="mb-2 text-sm font-black">آخر الاستخدامات</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="min-w-[600px] w-full text-xs">
              <thead className="bg-secondary/50">
                <tr><th className="px-3 py-2 text-right">الوقت</th><th className="px-2 py-2">الكود</th><th className="px-2 py-2">الطلب</th><th className="px-2 py-2">الجوال</th><th className="px-2 py-2">خصم</th></tr>
              </thead>
              <tbody>
                {redemptions.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">لا توجد استخدامات بعد</td></tr>}
                {redemptions.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{new Date(r.redeemed_at).toLocaleString("ar-EG")}</td>
                    <td className="px-2 py-2 font-black tracking-wider">{r.discount_codes?.code ?? "—"}</td>
                    <td className="px-2 py-2" dir="ltr">{r.order_id}</td>
                    <td className="px-2 py-2" dir="ltr">{r.customer_phone}</td>
                    <td className="px-2 py-2 text-center">{Number(r.amount_off).toLocaleString("ar-EG")} ر.ي</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-3xl bg-card p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">{editing.id ? "تعديل كود" : "كود جديد"}</h3>
              <button onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
            </div>
            <Field label="الكود"><input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-black tracking-wider" /></Field>
            <Field label="النوع">
              <select value={editing.kind ?? "percent"} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Code["kind"] })} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
                <option value="percent">نسبة مئوية %</option>
                <option value="flat">خصم ثابت (ر.ي)</option>
                <option value="free_shipping">شحن مجاني</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={editing.kind === "percent" ? "النسبة %" : "القيمة (ر.ي)"}>
                <input type="number" step="0.01" value={editing.value ?? 0} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </Field>
              <Field label="حد أدنى للطلب">
                <input type="number" step="0.01" value={editing.min_total ?? 0} onChange={(e) => setEditing({ ...editing, min_total: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="عدد الاستخدامات (اختياري)">
                <input type="number" value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </Field>
              <Field label="تاريخ الانتهاء">
                <input type="datetime-local" value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm" />
              </Field>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.first_order_only} onChange={(e) => setEditing({ ...editing, first_order_only: e.target.checked })} /> لأول طلب فقط</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> نشط</label>
            </div>
            <button onClick={handleSave} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white"><Save className="size-4" /> حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>{children}</label>;
}
