import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Crown, Plus, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inviteStaff, listStaff, removeStaff, updateStaffPermissions } from "@/lib/staff.functions";
import { Empty } from "./shared";

const ALL_PERMS: { v: "orders" | "prescriptions" | "users" | "products" | "pricing" | "integrations"; label: string; desc: string }[] = [
  { v: "orders", label: "إدارة الطلبات", desc: "عرض الطلبات وتحديث حالتها" },
  { v: "prescriptions", label: "إدارة الروشتات", desc: "عرض الروشتات وتحديث حالتها" },
  { v: "products", label: "إدارة الأصناف", desc: "إضافة وتعديل وحذف الأصناف واستيراد Excel/Sheets" },
  { v: "pricing", label: "الأسعار والعروض", desc: "تغيير الأسعار وإضافة عروض ترويجية" },
  { v: "integrations", label: "ربط الخدمات", desc: "ربط Google Workspace وأدوات خارجية" },
  { v: "users", label: "إدارة المستخدمين", desc: "صلاحية مساعدة" },
];

type StaffRow = { userId: string; email: string; isOwner: boolean; permissions: string[] };

export function StaffTab({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<StaffRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<string[]>(["orders", "prescriptions"]);
  const [busy, setBusy] = useState(false);

  const fnList = useServerFn(listStaff);
  const fnInvite = useServerFn(inviteStaff);
  const fnUpdate = useServerFn(updateStaffPermissions);
  const fnRemove = useServerFn(removeStaff);

  const load = useCallback(async () => {
    try { setRows(await fnList({})); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  }, [fnList]);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fnInvite({ data: { email: email.trim(), permissions: perms as any } });
      toast.success("تمت إضافة العضو ومنحه الصلاحيات");
      setEmail("");
      setPerms(["orders", "prescriptions"]);
      await load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function togglePerm(userId: string, perm: string, has: boolean) {
    const row = rows?.find((r) => r.userId === userId);
    if (!row) return;
    const next = has ? row.permissions.filter((p) => p !== perm) : [...row.permissions, perm];
    try {
      await fnUpdate({ data: { userId, permissions: next as any } });
      setRows((r) => r?.map((x) => x.userId === userId ? { ...x, permissions: next } : x) ?? null);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  async function remove(userId: string) {
    if (!confirm("حذف هذا العضو من الفريق؟")) return;
    try {
      await fnRemove({ data: { userId } });
      toast.success("تم حذف العضو");
      await load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <Crown className="mt-0.5 size-4 shrink-0" />
          <p>أنت <strong>المدير العام</strong> للموقع. يمكنك إضافة أعضاء فريق وتحديد صلاحياتهم. يجب على العضو إنشاء حساب أولاً من صفحة لوحة التحكم ثم تضيفه هنا ببريده.</p>
        </div>
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-3 flex items-center gap-2 text-sm font-black"><Plus className="size-4 text-primary" /> إضافة عضو جديد</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={busy} className="brand-gradient flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />} إضافة
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_PERMS.map((p) => {
            const on = perms.includes(p.v);
            return (
              <button type="button" key={p.v}
                onClick={() => setPerms((cur) => on ? cur.filter((x) => x !== p.v) : [...cur, p.v])}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
                <ShieldCheck className="size-3.5" /> {p.label}
              </button>
            );
          })}
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4 text-sm font-black flex items-center gap-2"><Users className="size-4 text-primary" /> أعضاء الفريق</div>
        {rows === null ? (
          <div className="grid place-items-center p-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Empty text="لا يوجد أعضاء بعد" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.userId} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black flex items-center gap-2">
                      <span dir="ltr">{r.email}</span>
                      {r.isOwner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700"><Crown className="size-3" /> المالك</span>}
                      {r.userId === currentUserId && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">أنت</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground" dir="ltr">{r.userId}</p>
                  </div>
                  {!r.isOwner && (
                    <button onClick={() => remove(r.userId)} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100">
                      <Trash2 className="size-3.5" /> حذف
                    </button>
                  )}
                </div>
                {!r.isOwner && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ALL_PERMS.map((p) => {
                      const has = r.permissions.includes(p.v);
                      return (
                        <button key={p.v} onClick={() => togglePerm(r.userId, p.v, has)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${has ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
                          <ShieldCheck className="size-3.5" /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
