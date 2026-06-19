import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-chrome";
import { LayoutDashboard, LogOut, Package, FileText, RefreshCw, Loader2, Lock, Filter, Users, Crown, Download, Bell, BellOff, Shield } from "lucide-react";
import { openWhatsApp, buildStatusMessage } from "@/lib/whatsapp";
import { toast } from "sonner";
import { bootstrapOwner, getMyRole } from "@/lib/staff.functions";
import { AdminStats } from "@/components/admin-stats";
import { MarketingBanner } from "@/components/marketing-banner";
import { DashboardCharts } from "@/components/dashboard-charts";
import { BundlePerformance } from "@/components/bundle-performance";
import { playNotificationBeep } from "@/lib/notify-sound";
import { downloadCSV } from "@/lib/csv-export";
import { STATUSES, applyChange, type Order, type Rx } from "@/components/admin/shared";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { PrescriptionsTab } from "@/components/admin/PrescriptionsTab";
import { StaffTab } from "@/components/admin/StaffTab";
import { TrustTab } from "@/components/admin/TrustTab";
import { ErrorsTab } from "@/components/admin/ErrorsTab";
import { InsuranceTab } from "@/components/admin/InsuranceTab";
import { RetentionTab } from "@/components/admin/RetentionTab";
import { EmailsTab } from "@/components/admin/EmailsTab";
import { SecurityTab } from "@/components/admin/SecurityTab";
import { ImagesTab } from "@/components/admin/ImagesTab";

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

function AdminPage() {
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession({ userId: data.session.user.id, email: data.session.user.email ?? "" });
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
        if (error) { console.error(error); setIsAdmin(false); return; }
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
  const [tab, setTab] = useState<"orders" | "rx" | "team" | "trust" | "errors" | "insurance" | "retention" | "emails" | "security" | "images">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<{ isOwner: boolean; isAdmin: boolean; permissions: string[] } | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const [newRx, setNewRx] = useState(0);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin-sound") !== "off";
  });
  const [statsKey, setStatsKey] = useState(0);
  const loadedRef = useRef(false);

  const fetchMyRole = useServerFn(getMyRole);
  const promote = useServerFn(bootstrapOwner);

  useEffect(() => {
    fetchMyRole({}).then(setMe).catch((e) => toast.error(String(e?.message ?? e)));
  }, [fetchMyRole]);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const [{ data: o, error: oe }, { data: r, error: re }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("prescriptions").select("*").order("created_at", { ascending: false }),
      ]);
      if (oe) throw oe;
      if (re) throw re;
      setOrders((o as unknown as Order[]) ?? []);
      setRxs((r as unknown as Rx[]) ?? []);
      setStatsKey((k) => k + 1);
      loadedRef.current = true;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    localStorage.setItem("admin-sound", soundOn ? "on" : "off");
  }, [soundOn]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        setOrders((cur) => applyChange(cur, p) as Order[]);
        if (p.eventType === "INSERT" && loadedRef.current) {
          setNewOrders((n) => n + 1);
          setStatsKey((k) => k + 1);
          if (soundOn) playNotificationBeep();
          toast.success(`طلب جديد: ${(p.new as Order).customer_name}`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" }, (p) => {
        setRxs((cur) => applyChange(cur, p) as Rx[]);
        // Invalidate image cache when image_urls change on update/delete so
        // stale signed URLs aren't reused after an Rx is edited.
        if (p.eventType !== "INSERT") {
          const row: any = p.new ?? p.old;
          if (row?.id) {
            void import("@/lib/image-cache").then(({ invalidateImagesMatching }) =>
              invalidateImagesMatching(String(row.id).toLowerCase())
            );
          }
        }
        if (p.eventType === "INSERT" && loadedRef.current) {
          setNewRx((n) => n + 1);
          setStatsKey((k) => k + 1);
          if (soundOn) playNotificationBeep();
          toast.success(`روشتة جديدة: ${(p.new as Rx).customer_name}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [soundOn]);

  function exportOrdersCSV() {
    const rows = orders.map((o) => [
      o.id, new Date(o.created_at).toLocaleString("ar-EG"), o.customer_name, o.customer_phone, o.customer_address,
      o.status, o.total, (o.items ?? []).map((i) => `${i.name} ×${i.qty}`).join(" | "), o.notes ?? "",
    ]);
    downloadCSV(`orders-${new Date().toISOString().slice(0,10)}.csv`,
      ["رقم الطلب","التاريخ","الاسم","الجوال","العنوان","الحالة","الإجمالي","المنتجات","ملاحظات"], rows);
    toast.success("تم تصدير الطلبات");
  }
  function exportRxCSV() {
    const rows = rxs.map((r) => [
      r.id, new Date(r.created_at).toLocaleString("ar-EG"), r.customer_name, r.customer_phone, r.customer_address,
      r.status, (r.image_urls ?? []).join(" | "), r.notes ?? "",
    ]);
    downloadCSV(`prescriptions-${new Date().toISOString().slice(0,10)}.csv`,
      ["رقم","التاريخ","الاسم","الجوال","العنوان","الحالة","الصور","ملاحظات"], rows);
    toast.success("تم تصدير الروشتات");
  }

  function notifyCustomerCloud(o: { id: string; customer_name: string; customer_phone: string }, status: string) {
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
  async function setRxStatus(id: string, status: string): Promise<void> {
    const prev = rxs.find((o) => o.id === id);
    const { error } = await supabase.from("prescriptions").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    setRxs((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("تم تحديث الحالة");
    if (prev && prev.status !== status && ["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      void notifyCustomerCloud(prev, status);
    }
  }
  async function archiveRx(id: string): Promise<void> {
    const { error } = await supabase.from("prescriptions").update({ status: "archived" }).eq("id", id);
    if (error) throw new Error(error.message);
    setRxs((p) => p.map((o) => (o.id === id ? { ...o, status: "archived" } : o)));
  }
  async function deleteRx(id: string): Promise<void> {
    const { error } = await supabase.from("prescriptions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setRxs((p) => p.filter((o) => o.id !== id));
    const { invalidateImagesMatching } = await import("@/lib/image-cache");
    invalidateImagesMatching(id.toLowerCase());
  }

  async function regenerateRxUrls(id: string): Promise<void> {
    const rx = rxs.find((r) => r.id === id);
    if (!rx) throw new Error("الروشتة غير موجودة");
    const { regenerateSignedUrl } = await import("@/lib/rx-url");
    const fresh: string[] = [];
    for (const u of rx.image_urls) {
      try { fresh.push(await regenerateSignedUrl(u)); }
      catch { fresh.push(u); /* keep old on failure */ }
    }
    const { error } = await supabase.from("prescriptions").update({ image_urls: fresh }).eq("id", id);
    if (error) throw new Error(error.message);
    setRxs((p) => p.map((o) => (o.id === id ? { ...o, image_urls: fresh } : o)));
    const { invalidateImagesMatching } = await import("@/lib/image-cache");
    invalidateImagesMatching(id.toLowerCase());
  }


  async function bulkDeleteRx(ids: string[], onProgress?: (done: number, total: number, currentId: string) => void): Promise<void> {
    const { invalidateImagesMatching } = await import("@/lib/image-cache");
    let lastErr: unknown = null;
    let done = 0;
    for (const id of ids) {
      onProgress?.(done, ids.length, id);
      try {
        const { error } = await supabase.from("prescriptions").delete().eq("id", id);
        if (error) throw new Error(error.message);
        setRxs((p) => p.filter((o) => o.id !== id));
        invalidateImagesMatching(id.toLowerCase());
      } catch (e) { lastErr = e; }
      done++;
      onProgress?.(done, ids.length, id);
    }
    if (lastErr) throw lastErr;
  }

  async function bulkArchiveRx(ids: string[], onProgress?: (done: number, total: number, currentId: string) => void): Promise<void> {
    let lastErr: unknown = null;
    let done = 0;
    for (const id of ids) {
      onProgress?.(done, ids.length, id);
      try {
        const { error } = await supabase.from("prescriptions").update({ status: "archived" }).eq("id", id);
        if (error) throw new Error(error.message);
        setRxs((p) => p.map((o) => (o.id === id ? { ...o, status: "archived" } : o)));
      } catch (e) { lastErr = e; }
      done++;
      onProgress?.(done, ids.length, id);
    }
    if (lastErr) throw lastErr;
  }

  async function bulkRegenerateRxUrls(ids: string[], onProgress?: (done: number, total: number, currentId: string) => void) {
    const { regenerateSignedUrl } = await import("@/lib/rx-url");
    const { invalidateImagesMatching } = await import("@/lib/image-cache");
    const failures: { id: string; reason: string }[] = [];
    let ok = 0;
    let done = 0;
    for (const id of ids) {
      onProgress?.(done, ids.length, id);
      try {
        const rx = rxs.find((r) => r.id === id);
        if (!rx) throw new Error("الروشتة غير موجودة");
        if (!rx.image_urls || rx.image_urls.length === 0) throw new Error("لا توجد روابط لتجديدها");
        const fresh: string[] = [];
        const perImageErrors: string[] = [];
        for (const u of rx.image_urls) {
          try { fresh.push(await regenerateSignedUrl(u)); }
          catch (ie: any) { fresh.push(u); perImageErrors.push(ie?.message || "فشل صورة"); }
        }
        if (perImageErrors.length === rx.image_urls.length) {
          throw new Error(perImageErrors[0] || "فشل تجديد كل الصور");
        }
        const { error } = await supabase.from("prescriptions").update({ image_urls: fresh }).eq("id", id);
        if (error) throw new Error(error.message);
        setRxs((p) => p.map((o) => (o.id === id ? { ...o, image_urls: fresh } : o)));
        invalidateImagesMatching(id.toLowerCase());
        ok++;
        if (perImageErrors.length > 0) {
          // partial: count as ok but record warning
          failures.push({ id, reason: `جزئي: ${perImageErrors.length}/${rx.image_urls.length} صورة فشلت — ${perImageErrors[0]}` });
        }
      } catch (e: any) {
        failures.push({ id, reason: e?.message || "خطأ غير معروف" });
      }
      done++;
      onProgress?.(done, ids.length, id);
    }
    return { ok, fail: failures.length, failures };
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
            <button onClick={() => setSoundOn((v) => !v)} className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تنبيه صوتي" title={soundOn ? "تنبيه صوتي مفعّل" : "صامت"}>
              {soundOn ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
            </button>
            <button onClick={load} disabled={busy} className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تحديث">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </button>
            <a href="/admin-command" className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">🎯 غرفة القيادة</a>
            <a href="/admin-marketing" className="flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/25">📣 الحملات</a>
            <a href="/admin-agents" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">🤖 الوكلاء</a>
            <a href="/admin-products" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الأصناف</a>
            <a href="/admin-classifications" className="flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/25">🧬 تصنيف الأدوية</a>
            <a href="/admin-inventory" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">المخزون</a>
            <a href="/admin-offers" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">العروض</a>
            <a href="/admin-discounts" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الأكواد</a>
            <a href="/admin-bundles" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الباقات</a>
            <a href="/admin-banners" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">البانرات</a>
            <a href="/admin-campaigns" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الحملات</a>
            <a href="/admin-settings" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">الإعدادات</a>
            {me?.isOwner && (
              <>
                <a href="/admin-backups" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">النسخ الاحتياطية</a>
                <a href="/admin-diagnostics" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">التشخيص</a>
                <a href="/admin-logs" className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">سجل النشاط</a>
              </>
            )}
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">
              <LogOut className="size-4" /> خروج
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-2">
          {canOrders && (
            <button onClick={() => { setTab("orders"); setNewOrders(0); }} className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "orders" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              <Package className="size-4" /> الطلبات ({orders.length})
              {newOrders > 0 && tab !== "orders" && <span className="absolute -top-1 -left-1 grid min-w-5 h-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white animate-pulse">{newOrders}</span>}
            </button>
          )}
          {canRx && (
            <button onClick={() => { setTab("rx"); setNewRx(0); }} className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "rx" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              <FileText className="size-4" /> الروشتات ({rxs.length})
              {newRx > 0 && tab !== "rx" && <span className="absolute -top-1 -left-1 grid min-w-5 h-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white animate-pulse">{newRx}</span>}
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("team")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "team" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              <Users className="size-4" /> الفريق والصلاحيات
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("trust")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "trust" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              <Shield className="size-4" /> الأمان والخصوصية
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("errors")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "errors" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              ⚠️ سجلات الأخطاء
            </button>
          )}
          {(me?.isOwner || me?.isAdmin || me?.permissions.includes("prescriptions")) && (
            <button onClick={() => setTab("insurance")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "insurance" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              <Shield className="size-4" /> طلبات التأمين
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("retention")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "retention" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              🗄️ الاحتفاظ والتنبيهات
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("emails")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "emails" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              📧 البريد
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("security")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "security" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              🛡️ الأمان
            </button>
          )}
          {me?.isOwner && (
            <button onClick={() => setTab("images")} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition ${tab === "images" ? "brand-gradient text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground hover:text-primary"}`}>
              🖼️ الصور
            </button>
          )}
          {tab !== "team" && tab !== "trust" && tab !== "errors" && tab !== "insurance" && tab !== "retention" && tab !== "emails" && tab !== "security" && tab !== "images" && (
            <>
              <div className="mx-2 h-6 w-px bg-border" />
              <Filter className="size-3.5 text-muted-foreground" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
                <option value="all">كل الحالات</option>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
              <button onClick={tab === "orders" ? exportOrdersCSV : exportRxCSV} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600" title="تصدير Excel/CSV">
                <Download className="size-3.5" /> تصدير
              </button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {(canOrders || canRx) && tab !== "team" && tab !== "trust" && tab !== "errors" && tab !== "insurance" && tab !== "retention" && tab !== "emails" && tab !== "security" && tab !== "images" && (
          <>
            <MarketingBanner placement="dashboard" />
            <AdminStats refreshKey={statsKey} />
            <DashboardCharts />
            <BundlePerformance />
          </>
        )}
        {tab === "orders" && canOrders && <OrdersTab orders={filteredOrders} onStatus={setOrderStatus} loading={busy && orders.length === 0} error={loadError} onRetry={load} />}
        {tab === "rx" && canRx && <PrescriptionsTab rxs={filteredRxs} onStatus={setRxStatus} onDelete={deleteRx} onArchive={archiveRx} onBulkDelete={bulkDeleteRx} onBulkArchive={bulkArchiveRx} onBulkRegenerateUrls={bulkRegenerateRxUrls} onRegenerateUrls={regenerateRxUrls} loading={busy && rxs.length === 0} error={loadError} onRetry={load} />}
        {tab === "team" && me?.isOwner && <StaffTab currentUserId={userId} />}
        {tab === "trust" && me?.isOwner && <TrustTab />}
        {tab === "errors" && me?.isOwner && <ErrorsTab />}
        {tab === "insurance" && <InsuranceTab />}
        {tab === "retention" && me?.isOwner && <RetentionTab />}
        {tab === "emails" && me?.isOwner && <EmailsTab />}
        {tab === "security" && me?.isOwner && <SecurityTab />}
        {tab === "images" && me?.isOwner && <ImagesTab />}
      </main>

      <SiteFooter />
    </div>
  );
}
