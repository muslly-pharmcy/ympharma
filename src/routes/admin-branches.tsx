// Admin UI for managing branches (warehouses, branches, offices).
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Save, X, ArrowRight, Warehouse, Building2, Briefcase } from "lucide-react";
import { listBranches, upsertBranch } from "@/lib/branches.functions";

export const Route = createFileRoute("/admin-branches")({
  head: () => ({ meta: [
    { title: "الفروع والمستودعات — الإدارة" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: () => (<AdminGate><AdminBranches /></AdminGate>),
});

type Branch = {
  id: string; code: string; name: string;
  type: "WAREHOUSE" | "BRANCH" | "OFFICE";
  address: string | null; phone: string | null;
  is_active: boolean;
};

const TYPE_META: Record<Branch["type"], { label: string; Icon: typeof Warehouse }> = {
  WAREHOUSE: { label: "مستودع",   Icon: Warehouse },
  BRANCH:    { label: "فرع",      Icon: Building2 },
  OFFICE:    { label: "مكتب",     Icon: Briefcase },
};

function AdminBranches() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [busy, setBusy] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editing, setEditing] = useState<Partial<Branch> | null>(null);

  const load = useServerFn(listBranches);
  const save = useServerFn(upsertBranch);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const list = await load({ data: { includeInactive } });
      setRows(list as Branch[]);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [load, includeInactive]);

  useEffect(() => { refresh(); }, [refresh]);

  async function commit() {
    if (!editing) return;
    if (!editing.code || !editing.name || !editing.type) {
      toast.error("الكود والاسم والنوع مطلوبة");
      return;
    }
    try {
      await save({ data: {
        id: editing.id, code: editing.code, name: editing.name, type: editing.type,
        address: editing.address ?? null, phone: editing.phone ?? null,
        is_active: editing.is_active ?? true,
      } as any });
      toast.success("تم الحفظ");
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary">
              <ArrowRight className="inline size-4 rotate-180" /> لوحة الإدارة
            </Link>
            <h1 className="text-xl font-bold">الفروع والمستودعات</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin-transfers" className="text-sm text-primary underline">التحويلات →</Link>
            <button
              onClick={() => setEditing({ type: "BRANCH", is_active: true })}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              <Plus className="size-4" /> فرع جديد
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 py-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)} />
          إظهار الفروع غير المفعّلة
        </label>

        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> جارٍ التحميل…</div>}

        <div className="overflow-x-auto rounded border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-right">
              <tr>
                <th className="p-2">الكود</th>
                <th className="p-2">الاسم</th>
                <th className="p-2">النوع</th>
                <th className="p-2">الهاتف</th>
                <th className="p-2">العنوان</th>
                <th className="p-2">الحالة</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const M = TYPE_META[b.type];
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-2 font-mono">{b.code}</td>
                    <td className="p-2">{b.name}</td>
                    <td className="p-2"><span className="inline-flex items-center gap-1"><M.Icon className="size-3.5" />{M.label}</span></td>
                    <td className="p-2">{b.phone ?? "—"}</td>
                    <td className="p-2">{b.address ?? "—"}</td>
                    <td className="p-2">{b.is_active ? "✓ نشط" : "—"}</td>
                    <td className="p-2 text-left">
                      <button onClick={() => setEditing(b)}
                        className="text-primary underline">تعديل</button>
                    </td>
                  </tr>
                );
              })}
              {!busy && rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد فروع.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-lg border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "تعديل فرع" : "فرع جديد"}</h2>
              <button onClick={() => setEditing(null)}><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الكود</label>
                <input className="w-full rounded border bg-background p-2" value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm">الاسم</label>
                <input className="w-full rounded border bg-background p-2" value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm">النوع</label>
                <select className="w-full rounded border bg-background p-2" value={editing.type ?? "BRANCH"}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as Branch["type"] })}>
                  <option value="WAREHOUSE">مستودع</option>
                  <option value="BRANCH">فرع</option>
                  <option value="OFFICE">مكتب</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">الهاتف</label>
                <input className="w-full rounded border bg-background p-2" value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm">العنوان</label>
                <input className="w-full rounded border bg-background p-2" value={editing.address ?? ""}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                فعّال
              </label>
              <button onClick={commit}
                className="flex w-full items-center justify-center gap-1 rounded bg-primary py-2 text-primary-foreground">
                <Save className="size-4" /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
