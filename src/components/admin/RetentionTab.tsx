import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Archive, Loader2, Mail, PlayCircle, Save, Send } from "lucide-react";
import {
  getRetentionConfig,
  updateRetentionConfig,
  runRetentionNow,
  testWhatsappInsuranceBot,
} from "@/lib/retention.functions";

type Cfg = {
  error_logs_days: number;
  error_logs_archive_days: number;
  incidents_days: number;
  incidents_archive_days: number;
  uptime_checks_days: number;
  archive_enabled: boolean;
  email_alerts_enabled: boolean;
  email_recipients: string[];
  email_cooldown_minutes: number;
};

const DEFAULTS: Cfg = {
  error_logs_days: 30,
  error_logs_archive_days: 180,
  incidents_days: 90,
  incidents_archive_days: 365,
  uptime_checks_days: 30,
  archive_enabled: true,
  email_alerts_enabled: false,
  email_recipients: [],
  email_cooldown_minutes: 60,
};

export function RetentionTab() {
  const fetchCfg = useServerFn(getRetentionConfig);
  const saveCfg = useServerFn(updateRetentionConfig);
  const runNow = useServerFn(runRetentionNow);
  const testBot = useServerFn(testWhatsappInsuranceBot);

  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [recipientsText, setRecipientsText] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    fetchCfg({}).then((d: any) => {
      if (d) {
        setCfg(d as Cfg);
        setRecipientsText((d.email_recipients ?? []).join(", "));
      }
    }).catch(() => { /* keep defaults */ }).finally(() => setLoading(false));
  }, [fetchCfg]);

  async function save() {
    setSaving(true);
    try {
      const recipients = recipientsText.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
      const payload = { ...cfg, email_recipients: recipients };
      await saveCfg({ data: payload });
      setCfg(payload);
      toast.success("تم حفظ الإعدادات");
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally { setSaving(false); }
  }

  async function handleRun() {
    if (!confirm("تشغيل سياسة الاحتفاظ الآن؟ سيتم أرشفة/حذف السجلات حسب الإعدادات.")) return;
    setRunning(true);
    try {
      const res = await runNow({});
      toast.success("تم تشغيل سياسة الاحتفاظ");
      console.log("retention result", res);
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally { setRunning(false); }
  }

  async function handleTestBot() {
    if (!testPhone) return toast.error("أدخل رقم واتساب للاختبار");
    setTestBusy(true);
    try {
      const res = await testBot({ data: { phone: testPhone, text: "تأمين" } });
      if (res.ok) toast.success(`تم إرسال رسالة الاختبار إلى ${res.sentTo} — افحص واتساب`);
      else toast.error(`فشل: ${res.status} — ${res.response}`);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setTestBusy(false); }
  }

  if (loading) return <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const num = (k: keyof Cfg) => (
    <input type="number" min={1} max={3650} value={cfg[k] as number}
      onChange={(e) => setCfg({ ...cfg, [k]: Math.max(1, Number(e.target.value) || 1) } as Cfg)}
      className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-bold" />
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-black"><Archive className="size-5" /> الاحتفاظ والأرشفة</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-50">
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />} تشغيل الآن
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} حفظ
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={cfg.archive_enabled}
            onChange={(e) => setCfg({ ...cfg, archive_enabled: e.target.checked })} />
          تفعيل الأرشفة قبل الحذف (موصى به)
        </label>
        <p className="text-xs text-muted-foreground">
          عند التفعيل: تُنقل السجلات القديمة إلى جداول الأرشيف ثم تُحذف بعد المدة الأطول.
          عند التعطيل: حذف نهائي مباشر بعد المدة الأولى.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Row label="سجلات الأخطاء — حذف/أرشفة بعد (يوم)">{num("error_logs_days")}</Row>
          {cfg.archive_enabled && (
            <Row label="حذف أرشيف الأخطاء بعد (يوم)">{num("error_logs_archive_days")}</Row>
          )}
          <Row label="الحوادث المنتهية — حذف/أرشفة بعد (يوم)">{num("incidents_days")}</Row>
          {cfg.archive_enabled && (
            <Row label="حذف أرشيف الحوادث بعد (يوم)">{num("incidents_archive_days")}</Row>
          )}
          <Row label="فحوصات التوفر — حذف بعد (يوم)">{num("uptime_checks_days")}</Row>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><Mail className="size-4" /> تنبيهات البريد للمشرفين</h3>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={cfg.email_alerts_enabled}
            onChange={(e) => setCfg({ ...cfg, email_alerts_enabled: e.target.checked })} />
          إرسال بريد عند فتح حادث جديد
        </label>
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">عناوين البريد (افصل بفواصل)</label>
          <textarea rows={2} value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)}
            placeholder="admin@muslly.com, ops@muslly.com"
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <Row label="حد التكرار بين تنبيهات نفس الحادث (دقيقة)">
          <input type="number" min={1} max={1440} value={cfg.email_cooldown_minutes}
            onChange={(e) => setCfg({ ...cfg, email_cooldown_minutes: Math.max(1, Number(e.target.value) || 1) })}
            className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-bold" />
        </Row>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          💡 إرسال البريد يتطلب تهيئة نطاق بريد لمرة واحدة. بعد التفعيل، احفظ الإعدادات هنا ثم اطلب من فريق التطوير ربط البريد.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-black"><Send className="size-4" /> اختبار بوت واتساب — نموذج التأمين</h3>
        <p className="text-xs text-muted-foreground">
          سيتم محاكاة استلام رسالة "تأمين" من الرقم المُدخل عبر webhook الفعلي، وسيرد البوت برسالة واتساب حقيقية إلى نفس الرقم تحتوي رابط <code>/insurance</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <input dir="ltr" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
            placeholder="9677XXXXXXXX" className="flex-1 min-w-[200px] rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary" />
          <button onClick={handleTestBot} disabled={testBusy}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600 disabled:opacity-50">
            {testBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} إرسال اختبار
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
      <span className="text-xs font-bold">{label}</span>
      {children}
    </div>
  );
}
