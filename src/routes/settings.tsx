import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Bell, Globe, Trash2, Download, Smartphone, Shield, Info, ArrowRight, Sparkles } from "lucide-react";
import classicLogo from "@/assets/almusalli-logo.webp";
import goldenLogoAsset from "@/assets/almusalli-golden-mark.png.asset.json";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — صيدلية المصلي" },
      { name: "description", content: "إعدادات تطبيق صيدلية المصلي: اللغة، الإشعارات، التخزين المؤقت، وتثبيت التطبيق." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/settings" }],
  }),
  component: SettingsPage,
});

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function SettingsPage() {
  const { lang, setLang } = useI18n();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("—");
  const [version] = useState("1.0.0");
  const [logoVariant, setLogoVariant] = useState<"classic" | "golden">("classic");

  useEffect(() => {
    try {
      const v = localStorage.getItem("logoVariant");
      setLogoVariant(v === "golden" ? "golden" : "classic");
    } catch {}
  }, []);

  function setVariant(v: "classic" | "golden") {
    setLogoVariant(v);
    try {
      localStorage.setItem("logoVariant", v);
      window.dispatchEvent(new Event("logo-variant-change"));
    } catch {}
    toast.success(v === "golden" ? "تم تفعيل الشعار الذهبي" : "تم العودة للشعار الكلاسيكي");
  }

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onBIP = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    estimateCache().then(setCacheSize);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function estimateCache(): Promise<string> {
    try {
      if (navigator.storage?.estimate) {
        const { usage = 0 } = await navigator.storage.estimate();
        return formatBytes(usage);
      }
    } catch {}
    return "غير متاح";
  }

  function formatBytes(b: number) {
    if (!b) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") return toast.error("الإشعارات غير مدعومة على هذا الجهاز");
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    if (p === "granted") toast.success("تم تفعيل الإشعارات");
    else toast.message("لم يتم تفعيل الإشعارات");
  }

  async function clearCache() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.clear();
      sessionStorage.clear();
      toast.success("تم مسح الكاش — سيتم إعادة تحميل الصفحة");
      setTimeout(() => location.reload(), 800);
    } catch {
      toast.error("تعذر مسح الكاش");
    }
  }

  async function installApp() {
    if (!installEvt) return toast.message("استخدم خيار «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح");
    await installEvt.prompt();
    const res = await installEvt.userChoice;
    if (res.outcome === "accepted") toast.success("تم تثبيت التطبيق");
    setInstallEvt(null);
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> الرئيسية
        </Link>
      </div>

      <div className="space-y-4">
        <Section icon={<Globe className="h-5 w-5" />} title="اللغة" desc="اختر لغة الواجهة">
          <div className="flex gap-2">
            <Btn active={lang === "ar"} onClick={() => setLang("ar")}>العربية</Btn>
            <Btn active={lang === "en"} onClick={() => setLang("en")}>English</Btn>
          </div>
        </Section>

        <Section icon={<Bell className="h-5 w-5" />} title="الإشعارات" desc="استلم تنبيهات حالة طلبك">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              الحالة: {notifPerm === "granted" ? "✅ مفعّل" : notifPerm === "denied" ? "❌ مرفوض" : "غير محدد"}
            </span>
            <button onClick={requestNotif} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
              {notifPerm === "granted" ? "إعادة الطلب" : "تفعيل"}
            </button>
          </div>
        </Section>

        <Section icon={<Smartphone className="h-5 w-5" />} title="تثبيت التطبيق" desc="ثبّت المصلي على شاشتك الرئيسية">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {installed ? "✅ التطبيق مثبّت" : "غير مثبّت"}
            </span>
            <button
              onClick={installApp}
              disabled={installed}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> تثبيت
            </button>
          </div>
        </Section>

        <Section icon={<Trash2 className="h-5 w-5" />} title="التخزين المؤقت" desc={`المساحة المستخدمة: ${cacheSize}`}>
          <button onClick={clearCache} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
            مسح الكاش وإعادة التحميل
          </button>
        </Section>

        <Section icon={<Shield className="h-5 w-5" />} title="الخصوصية والأمان" desc="بياناتك محمية ومشفّرة">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• الاتصال آمن عبر HTTPS</p>
            <p>• لا نشارك بياناتك مع أطراف ثالثة</p>
            <p>• الطلبات تتم عبر واتساب الرسمي</p>
          </div>
        </Section>

        <Section icon={<Info className="h-5 w-5" />} title="عن التطبيق" desc="">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>الإصدار: <span className="font-medium text-foreground">{version}</span></p>
            <p>الموقع: <a href="https://muslly.com" className="text-primary hover:underline">muslly.com</a></p>
            <p>© {new Date().getFullYear()} صيدلية المصلي — جميع الحقوق محفوظة</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{title}</h2>
          {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <div className="pr-11">{children}</div>
    </div>
  );
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
