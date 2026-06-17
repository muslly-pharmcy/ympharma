import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, KeyRound, Globe, Mail, FileSpreadsheet, HardDrive, CheckCircle2, DatabaseBackup, Download, MessageCircle, Send } from "lucide-react";
import { testWhatsAppCloud } from "@/lib/whatsapp-test.functions";


export const Route = createFileRoute("/admin-settings")({
  head: () => ({ meta: [{ title: "الإعدادات والتكاملات — صيدلية المصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setEmail(data.session.user.email ?? "");
      setReady(true);
    });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (pw1 !== pw2) return toast.error("تأكيد كلمة المرور غير مطابق");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح");
      setPw1(""); setPw2("");
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/admin" className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent"><ArrowRight className="size-4" /></Link>
          <h1 className="text-sm font-black">الإعدادات والتكاملات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Change password */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
            <div>
              <h2 className="text-base font-black">تغيير كلمة المرور</h2>
              <p className="text-xs text-muted-foreground" dir="ltr">{email}</p>
            </div>
          </div>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <input type="password" required minLength={8} value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="تأكيد كلمة المرور" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <button disabled={busy} className="brand-gradient flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />} حفظ كلمة المرور
            </button>
          </form>
        </section>

        {/* Google Workspace integrations */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-black">تكاملات Google Workspace</h2>
          <p className="mt-1 text-xs text-muted-foreground">حالة ربط الموقع بخدمات جوجل. يمكن إدارة الاتصالات من إعدادات المشروع.</p>
          <div className="mt-4 grid gap-2">
            <IntegrationRow icon={Globe} title="Google Search Console" desc="رفع sitemap.xml ومراقبة فهرسة الموقع." status="connected" />
            <IntegrationRow icon={FileSpreadsheet} title="Google Sheets" desc="استيراد الأصناف من Google Sheet عبر رابط مشاركة عام." status="ready" />
            <IntegrationRow icon={HardDrive} title="Google Drive" desc="ربط مجلد لاستخدامه في رفع صور الأصناف أو الوصفات." status="optional" />
            <IntegrationRow icon={Mail} title="Gmail" desc="إرسال إشعارات الطلبات والوصفات بالبريد." status="optional" />
          </div>
          <div className="mt-4 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            💡 لاستيراد الأصناف من Google Sheet الآن، اذهب إلى <Link to="/admin-products" className="font-bold text-primary">إدارة الأصناف</Link> ← استيراد Excel/Sheets.
          </div>
        </section>

        <BackupSection />
        <WhatsAppCloudSection />

      </main>
    </div>
  );
}

function BackupSection() {
  const [busy, setBusy] = useState(false);
  async function downloadBackup() {
    setBusy(true);
    try {
      const [orders, prescriptions, products, offers, activity_logs] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("prescriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*"),
        supabase.from("offers").select("*"),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(1000),
      ]);
      const dump = {
        meta: { app: "almusalli-pharmacy", exportedAt: new Date().toISOString(), version: 1 },
        orders: orders.data ?? [],
        prescriptions: prescriptions.data ?? [],
        products: products.data ?? [],
        offers: offers.data ?? [],
        activity_logs: activity_logs.data ?? [],
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `almusalli-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل النسخة الاحتياطية");
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><DatabaseBackup className="size-5" /></div>
        <div>
          <h2 className="text-base font-black">النسخة الاحتياطية</h2>
          <p className="text-xs text-muted-foreground">تنزيل ملف JSON يحوي الطلبات والروشتات والأصناف والعروض وسجلات النشاط.</p>
        </div>
      </div>
      <button onClick={downloadBackup} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        تنزيل نسخة احتياطية كاملة
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground">احتفظ بالنسخ الاحتياطية في مكان آمن. يُنصح بالتنزيل أسبوعياً على الأقل.</p>
    </section>
  );
}

function WhatsAppCloudSection() {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; text: string }>(null);

  async function run() {
    if (!to.trim()) return toast.error("أدخل رقم جوال للاختبار");
    setBusy(true);
    setResult(null);
    try {
      const r = await testWhatsAppCloud({ data: { to: to.trim() } });
      if (r.ok) {
        toast.success("تم الإرسال بنجاح — تحقق من واتساب");
        setResult({ ok: true, text: `HTTP ${r.httpStatus}\n${r.response}` });
      } else {
        toast.error("فشل الإرسال — اقرأ التفاصيل أدناه");
        setResult({ ok: false, text: r.error ? r.error : `HTTP ${r.httpStatus}\n${r.response}` });
      }
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
      setResult({ ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><MessageCircle className="size-5" /></div>
        <div>
          <h2 className="text-base font-black">WhatsApp Cloud — اختبار الإرسال التلقائي</h2>
          <p className="text-xs text-muted-foreground">أرسل رسالة تجريبية باستخدام القالب المعتمد للتأكد من جاهزية التكامل.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="رقم الجوال للاختبار (مثال: 7XXXXXXXX)"
          dir="ltr"
          className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button onClick={run} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          إرسال اختبار
        </button>
      </div>
      {result && (
        <pre dir="ltr" className={`mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-[11px] ${result.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-900"}`}>
{result.text}
        </pre>
      )}
      <ol className="mt-4 list-decimal space-y-1 pr-4 text-[12px] text-muted-foreground">
        <li>أضف رقم واتساب الأعمال في Meta وتحقق منه.</li>
        <li>أنشئ قالباً باسم مطابق لـ <code className="rounded bg-secondary px-1 font-mono">WHATSAPP_TEMPLATE_NAME</code> بلغة <code className="rounded bg-secondary px-1">ar</code> وبأربعة متغيرات: الاسم، رقم الطلب، الحالة، الرابط.</li>
        <li>انتظر اعتماد القالب (عادةً دقائق) ثم جرّب الإرسال هنا.</li>
        <li>أضف رقم اختبار في Meta API Setup إذا كان الحساب في وضع التطوير.</li>
      </ol>
    </section>
  );
}



function IntegrationRow({ icon: Icon, title, desc, status }: { icon: any; title: string; desc: string; status: "connected" | "ready" | "optional" }) {
  const tone = status === "connected" ? "bg-emerald-100 text-emerald-700" : status === "ready" ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground";
  const label = status === "connected" ? "مفعّل" : status === "ready" ? "جاهز" : "اختياري";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
      <div className="grid size-9 place-items-center rounded-xl bg-card"><Icon className="size-4" /></div>
      <div className="grow">
        <div className="flex items-center gap-2"><span className="text-sm font-black">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tone}`}>{status === "connected" && <CheckCircle2 className="ml-0.5 inline size-3" />}{label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
