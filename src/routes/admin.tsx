import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-chrome";
import { LayoutDashboard, LogOut, Package, FileText, MessageCircle, RefreshCw, Loader2, Lock, Filter, Users, Crown, Plus, Trash2, ShieldCheck, Download, Bell, BellOff } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { toast } from "sonner";
import { bootstrapOwner, getMyRole, inviteStaff, listStaff, removeStaff, updateStaffPermissions } from "@/lib/staff.functions";
import { AdminStats } from "@/components/admin-stats";
import { playNotificationBeep } from "@/lib/notify-sound";
import { downloadCSV } from "@/lib/csv-export";



export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — صيدلية المصلي" },
      { name: "description", content: "لوحة تحكم خاصة بفريق صيدلية المصلي لإدارة الطلبات والروشتات وصلاحيات الموظفين." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  total: number;
  status: string;
  items: { id: number; qty: number; name: string; price: number }[];
  created_at: string;
};
type Rx = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  image_urls: string[];
  status: string;
  created_at: string;
};

const STATUSES: { v: string; label: string; color: string }[] = [
  { v: "pending", label: "قيد المراجعة", color: "bg-amber-100 text-amber-700" },
  { v: "confirmed", label: "تم التأكيد", color: "bg-blue-100 text-blue-700" },
  { v: "shipped", label: "في الطريق", color: "bg-purple-100 text-purple-700" },
  { v: "delivered", label: "تم التسليم", color: "bg-emerald-100 text-emerald-700" },
  { v: "cancelled", label: "ملغي", color: "bg-rose-100 text-rose-700" },
];

function statusBadge(s: string) {
  return STATUSES.find((x) => x.v === s) ?? { v: s, label: s, color: "bg-secondary text-foreground" };
}

function applyChange<T extends { id: string }>(cur: T[], payload: { eventType: string; new: any; old: any }): T[] {
  if (payload.eventType === "INSERT") {
    if (cur.some((x) => x.id === payload.new.id)) return cur;
    return [payload.new as T, ...cur];
  }
  if (payload.eventType === "UPDATE") {
    return cur.map((x) => (x.id === payload.new.id ? (payload.new as T) : x));
  }
  if (payload.eventType === "DELETE") {
    return cur.filter((x) => x.id !== payload.old.id);
  }
  return cur;
}


function AdminPage() {
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({ userId: data.session.user.id, email: data.session.user.email ?? "" });
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setSession({ userId: s.user.id, email: s.user.email ?? "" });
      else { setSession(null); setIsAdmin(null); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.userId)
      .in("role", ["admin", "owner"])
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin((data ?? []).some((row) => row.role === "admin" || row.role === "owner"));
      });
  }, [session]);

  if (loading) return <Center><Loader2 className="size-6 animate-spin text-primary" /></Center>;
  if (!session) return <LoginCard />;
  if (isAdmin === null) return <Center><Loader2 className="size-6 animate-spin text-primary" /></Center>;
  if (!isAdmin) return <NotAdmin email={session.email} />;
  return <Dashboard email={session.email} userId={session.userId} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background">{children}</div>;
}

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) toast.error(error.message);
        else toast.success("تم إنشاء الحساب — اطلب من المسؤول منحك صلاحية الأدمن.");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6 shadow-elevated">
        <div className="text-center">
          <div className="brand-gradient mx-auto grid size-14 place-items-center rounded-2xl text-primary-foreground shadow-card"><Lock className="size-7" /></div>
          <h1 className="mt-3 text-xl font-black">لوحة تحكم الصيدلية</h1>
          <p className="text-xs text-muted-foreground">سجّل الدخول للوصول إلى الطلبات والروشتات</p>
        </div>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" minLength={6} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <button disabled={busy} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-primary-foreground shadow-card disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "in" ? "دخول" : "إنشاء حساب"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-xs text-muted-foreground hover:text-primary">
          {mode === "in" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}

function NotAdmin({ email }: { email: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4 text-center">
      <div className="max-w-md space-y-3 rounded-3xl border border-border bg-card p-8 shadow-card">
        <Lock className="mx-auto size-10 text-amber-500" />
        <h1 className="text-lg font-black">لا تملك صلاحية الأدمن</h1>
        <p className="text-sm text-muted-foreground">حسابك <strong dir="ltr">{email}</strong> تم إنشاؤه، لكنه لم يُمنح دور <code>admin</code> بعد. تواصل مع مسؤول النظام لإضافتك.</p>
        <button onClick={() => supabase.auth.signOut()} className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold">تسجيل خروج</button>
      </div>
    </div>
  );
}

function Dashboard({ email, userId }: { email: string; userId: string }) {
  const [tab, setTab] = useState<"orders" | "rx" | "team">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ isOwner: boolean; isAdmin: boolean; permissions: string[] } | null>(null);

  const fetchMyRole = useServerFn(getMyRole);
  const promote = useServerFn(bootstrapOwner);

  useEffect(() => {
    fetchMyRole({}).then(setMe).catch((e) => toast.error(String(e?.message ?? e)));
  }, [fetchMyRole]);

  const load = useCallback(async () => {
    setBusy(true);
    const [{ data: o }, { data: r }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("prescriptions").select("*").order("created_at", { ascending: false }),
    ]);
    setOrders((o as Order[]) ?? []);
    setRxs((r as Rx[]) ?? []);
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: live-update orders & prescriptions without manual refresh
  useEffect(() => {
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        setOrders((cur) => applyChange(cur, p) as Order[]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" }, (p) => {
        setRxs((cur) => applyChange(cur, p) as Rx[]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function notifyCustomerCloud(o: { id: string; customer_name: string; customer_phone: string }, status: string) {
    // إرسال مجاني عبر رابط wa.me — يفتح واتساب على رقم العميل برسالة جاهزة
    openWhatsApp(buildStatusMessage({ name: o.customer_name, orderId: o.id, status }), o.customer_phone);
    toast.success("تم فتح واتساب — اضغط إرسال لإكمال الإشعار");
  }

  async function setOrderStatus(id: string, status: string) {
    const prev = orders.find((o) => o.id === id);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("تم تحديث الحالة");
    if (prev && prev.status !== status && ["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      void notifyCustomerCloud(prev, status);
    }
  }
  async function setRxStatus(id: string, status: string) {
    const prev = rxs.find((o) => o.id === id);
    const { error } = await supabase.from("prescriptions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRxs((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("تم تحديث الحالة");
    if (prev && prev.status !== status && ["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      void notifyCustomerCloud(prev, status);
    }
  }



  async function handlePromote() {
    try {
      const res = await promote({});
      if (res.promoted) {
        toast.success("تمت ترقيتك إلى مالك الموقع");
        const r = await fetchMyRole({});
        setMe(r);
      } else {
        toast.error("يوجد مالك بالفعل أو لست مسؤولاً");
      }
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    }
  }

  const canOrders = me?.isOwner || me?.isAdmin || me?.permissions.includes("orders");
  const canRx = me?.isOwner || me?.isAdmin || me?.permissions.includes("prescriptions");

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const filteredRxs = filter === "all" ? rxs : rxs.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="brand-gradient grid size-10 place-items-center rounded-xl text-primary-foreground"><LayoutDashboard className="size-5" /></div>
            <div>
              <p className="text-sm font-black flex items-center gap-1.5">
                لوحة تحكم صيدلية المصلي
                {me?.isOwner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700"><Crown className="size-3" /> مالك</span>}
              </p>
              <p className="text-[11px] text-muted-foreground" dir="ltr">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {me && !me.isOwner && me.isAdmin && (
              <button onClick={handlePromote} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600" title="إذا لم يوجد مالك بعد، يمكنك ترقية نفسك">
                <Crown className="size-4" /> كن المالك
              </button>
            )}
            <button onClick={load} disabled={busy} className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تحديث">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </button>
            <a href="/admin-products" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الأصناف</a>
            <a href="/admin-offers" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">العروض</a>
            <a href="/admin-settings" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الإعدادات</a>
            {me?.isOwner && (
              <>
                <a href="/admin-diagnostics" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">التشخيص</a>
                <a href="/admin-logs" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">
                  سجل النشاط
                </a>
              </>
            )}
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">
              <LogOut className="size-4" /> خروج
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-2">
          {canOrders && <Tab active={tab === "orders"} onClick={() => setTab("orders")} icon={Package} label={`الطلبات (${orders.length})`} />}
          {canRx && <Tab active={tab === "rx"} onClick={() => setTab("rx")} icon={FileText} label={`الروشتات (${rxs.length})`} />}
          {me?.isOwner && <Tab active={tab === "team"} onClick={() => setTab("team")} icon={Users} label="الفريق والصلاحيات" />}
          {tab !== "team" && (
            <>
              <div className="mx-2 h-6 w-px bg-border" />
              <Filter className="size-3.5 text-muted-foreground" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
                <option value="all">كل الحالات</option>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-6">
        {tab === "orders" && canOrders && (
          filteredOrders.length === 0
            ? <Empty text="لا توجد طلبات" />
            : filteredOrders.map((o) => <OrderCard key={o.id} order={o} onStatus={setOrderStatus} />)
        )}
        {tab === "rx" && canRx && (
          filteredRxs.length === 0
            ? <Empty text="لا توجد روشتات" />
            : filteredRxs.map((r) => <RxCard key={r.id} rx={r} onStatus={setRxStatus} />)
        )}
        {tab === "team" && me?.isOwner && <TeamPanel currentUserId={userId} />}
      </main>

      <SiteFooter />
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Package; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${active ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
      <Icon className="size-4" /> {label}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">{text}</div>;
}

function OrderCard({ order, onStatus }: { order: Order; onStatus: (id: string, s: string) => void }) {
  const b = statusBadge(order.status);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-primary-deep">{order.id}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-EG")}</p>
          <p className="mt-1 text-sm font-bold">{order.customer_name} · <span dir="ltr" className="text-muted-foreground">{order.customer_phone}</span></p>
          <p className="text-xs text-muted-foreground">📍 {order.customer_address}</p>
          {order.notes && <p className="mt-1 text-xs">📝 {order.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
          <p className="text-lg font-black text-primary-deep">{formatPrice(Number(order.total))} ر.ي</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 rounded-xl bg-secondary/40 p-3 text-xs">
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between">
            <span>{it.name} × {it.qty}</span>
            <span className="font-bold">{formatPrice(it.price * it.qty)} ر.ي</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={order.status} onChange={(e) => onStatus(order.id, e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button
          onClick={() => openWhatsApp(buildStatusMessage({ name: order.customer_name, orderId: order.id, status: "confirmed" }), order.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> إشعار: جاهز/مؤكد</button>
        <button
          onClick={() => openWhatsApp(`مرحبًا ${order.customer_name}، بخصوص طلبك ${order.id} من صيدلية المصلي:`, order.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> واتساب العميل</button>
      </div>

    </div>
  );
}

function RxCard({ rx, onStatus }: { rx: Rx; onStatus: (id: string, s: string) => void }) {
  const b = statusBadge(rx.status);
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-primary-deep">{rx.id}</p>
          <p className="text-xs text-muted-foreground">{new Date(rx.created_at).toLocaleString("ar-EG")}</p>
          <p className="mt-1 text-sm font-bold">{rx.customer_name} · <span dir="ltr" className="text-muted-foreground">{rx.customer_phone}</span></p>
          <p className="text-xs text-muted-foreground">📍 {rx.customer_address}</p>
          {rx.notes && <p className="mt-1 text-xs">📝 {rx.notes}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
      </div>

      {rx.image_urls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rx.image_urls.map((u, i) => (
            <button key={i} type="button" onClick={() => setZoom(u)} className="block overflow-hidden rounded-lg border border-border">
              <img src={u} alt={`روشتة ${i + 1}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover transition hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 animate-in fade-in"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoom(null); }}
            aria-label="إغلاق"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >✕</button>
          <img
            src={zoom}
            alt="عرض الروشتة بالحجم الكامل"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-elevated"
          />
          <a
            href={zoom}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-foreground hover:bg-white"
          >فتح الصورة الأصلية</a>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={rx.status} onChange={(e) => onStatus(rx.id, e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <button
          onClick={() => openWhatsApp(buildStatusMessage({ name: rx.customer_name, orderId: rx.id, status: "confirmed" }), rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> إشعار: جاهز</button>
        <button
          onClick={() => openWhatsApp(`مرحبًا ${rx.customer_name}، بخصوص روشتتك ${rx.id} من صيدلية المصلي:`, rx.customer_phone)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
        ><MessageCircle className="size-3.5" /> واتساب العميل</button>

      </div>
    </div>
  );
}

const ALL_PERMS: { v: "orders" | "prescriptions" | "users" | "products" | "pricing" | "integrations"; label: string; desc: string }[] = [
  { v: "orders", label: "إدارة الطلبات", desc: "عرض الطلبات وتحديث حالتها" },
  { v: "prescriptions", label: "إدارة الروشتات", desc: "عرض الروشتات وتحديث حالتها" },
  { v: "products", label: "إدارة الأصناف", desc: "إضافة وتعديل وحذف الأصناف واستيراد Excel/Sheets" },
  { v: "pricing", label: "الأسعار والعروض", desc: "تغيير الأسعار وإضافة عروض ترويجية" },
  { v: "integrations", label: "ربط الخدمات", desc: "ربط Google Workspace وأدوات خارجية" },
  { v: "users", label: "إدارة المستخدمين", desc: "صلاحية مساعدة" },
];

type StaffRow = { userId: string; email: string; isOwner: boolean; permissions: string[] };

function TeamPanel({ currentUserId }: { currentUserId: string }) {
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
          <input
            required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
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
