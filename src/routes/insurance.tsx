import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { submitInsuranceClaim } from "@/lib/insurance.functions";
import { toast } from "sonner";
import { Loader2, Shield, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/insurance")({
  head: () => ({
    meta: [
      { title: "خدمة التأمين الطبي — صيدلية المصلي" },
      { name: "description", content: "ارفع بطاقة تأمين الشركة المتخصصة للتأمين والوصفة الطبية المختومة لاستلام أدويتك المؤمّنة." },
      { property: "og:title", content: "خدمة التأمين الطبي — صيدلية المصلي" },
      { property: "og:description", content: "نموذج رفع طلب تأمين طبي مع التحقق التلقائي من صلاحية البطاقة وتاريخ الوصفة." },
    ],
  }),
  component: InsurancePage,
});

const MAX_MB = 8;

async function uploadImage(file: File, prefix: string): Promise<string> {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`الصورة أكبر من ${MAX_MB} ميجا`);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("insurance").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  // Return the storage path; staff will generate signed URLs when viewing.
  return path;
}

function InsurancePage() {
  const submit = useServerFn(submitInsuranceClaim);

  const [insuranceCompany, setInsuranceCompany] = useState("المتخصصة للتأمين");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().slice(0, 10));
  const [diagnosis, setDiagnosis] = useState("");
  const [isStamped, setIsStamped] = useState(false);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; ok: boolean; issues: string[] } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardFile || !rxFile) {
      toast.error("الرجاء رفع صورة البطاقة وصورة الوصفة");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const [cardUrl, rxUrl] = await Promise.all([
        uploadImage(cardFile, "cards"),
        uploadImage(rxFile, "prescriptions"),
      ]);
      const res = await submit({
        data: {
          insuranceCompany,
          insuranceNumber,
          patientName,
          patientPhone,
          cardImageUrl: cardUrl,
          cardExpiry,
          prescriptionImageUrl: rxUrl,
          prescriptionDate,
          diagnosis,
          isStamped,
          channel: "web",
        },
      });
      setResult({ id: res.id, ok: res.validation.ok, issues: res.validation.issues });
      if (res.validation.ok) toast.success("تم استلام طلبك بنجاح");
      else toast.warning("تم استلام الطلب مع ملاحظات");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className={`rounded-2xl border p-6 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              {result.ok
                ? <CheckCircle2 className="size-10 text-emerald-600 shrink-0" />
                : <AlertTriangle className="size-10 text-amber-600 shrink-0" />}
              <div>
                <h1 className="text-xl font-black">{result.ok ? "تم استلام طلبك" : "تم استلام الطلب مع ملاحظات"}</h1>
                <p className="mt-1 text-sm">سيتواصل معك فريقنا قريباً عبر واتساب على <strong dir="ltr">{patientPhone}</strong>.</p>
                <p className="mt-2 text-xs text-muted-foreground" dir="ltr">رقم المرجع: {result.id.slice(0, 8)}</p>
                {result.issues.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pr-5 text-sm">
                    {result.issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => { setResult(null); setCardFile(null); setRxFile(null); }}
              className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              تقديم طلب آخر
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Shield className="size-4" /> خدمة التأمين الطبي
          </div>
          <h1 className="text-3xl font-black">رفع طلب تأمين طبي</h1>
          <p className="text-sm text-muted-foreground">
            ارفع بطاقتك التأمينية والوصفة الطبية المختومة وسنتحقق من صلاحيتها تلقائياً.
            معتمدون مع <strong>{insuranceCompany}</strong> وغيرها.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم شركة التأمين">
              <input value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)} required
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="رقم بطاقة التأمين">
              <input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} required
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="اسم المريض">
              <input value={patientName} onChange={(e) => setPatientName(e.target.value)} required
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="رقم الجوال (واتساب)">
              <input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required dir="ltr"
                placeholder="7XXXXXXXX"
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="تاريخ انتهاء البطاقة">
              <input type="date" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="تاريخ الوصفة">
              <input type="date" value={prescriptionDate} onChange={(e) => setPrescriptionDate(e.target.value)} required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
            </Field>
          </div>

          <Field label="التشخيص (كما هو مكتوب في الوصفة)">
            <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required rows={2}
              placeholder="مثال: التهاب لوزتين حاد"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileBox label="صورة بطاقة التأمين" file={cardFile} onChange={setCardFile} />
            <FileBox label="صورة الوصفة الطبية (مختومة)" file={rxFile} onChange={setRxFile} />
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <input type="checkbox" checked={isStamped} onChange={(e) => setIsStamped(e.target.checked)} className="mt-1" />
            <span>أؤكد أن الوصفة الطبية <strong>مختومة من الطبيب أو العيادة</strong>، وأن التشخيص مكتوب فيها بوضوح، وتاريخها لا يتجاوز 7 أيام.</span>
          </label>

          <button disabled={busy}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-primary-foreground shadow-card disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? "جاري الرفع…" : "إرسال الطلب"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-black text-foreground">{label}</span>
      {children}
    </label>
  );
}

function FileBox({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black">{label}</span>
      <div className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center text-xs transition ${
        file ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary"
      }`}>
        <Upload className="size-5" />
        {file ? <span className="font-bold">{file.name}</span> : <span>اضغط لرفع صورة (PNG/JPG، حتى {MAX_MB}MB)</span>}
        <input type="file" accept="image/*" className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </div>
    </label>
  );
}
