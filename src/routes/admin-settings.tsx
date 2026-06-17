import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, KeyRound, Globe, Mail, FileSpreadsheet, HardDrive, CheckCircle2, DatabaseBackup, Download } from "lucide-react";

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
      </main>
    </div>
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
