// Phoenix Quick Execution — reusable doctor join form.
// Architecture is generic enough for a future "verification" admin flow.
import { useState } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, Upload } from "lucide-react";

export const doctorJoinSchema = z.object({
  full_name: z.string().trim().min(3, "الاسم قصير جداً").max(120),
  specialty: z.string().trim().min(2, "اختر التخصص").max(80),
  city: z.string().trim().min(2, "اختر المدينة").max(80),
  clinic: z.string().trim().min(2, "اسم العيادة/المستشفى").max(160),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{7,20}$/, "رقم هاتف غير صالح"),
  email: z.string().trim().email("بريد غير صالح").max(255).optional().or(z.literal("")),
  working_hours: z.string().trim().min(3, "أضف ساعات العمل").max(200),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  request_verification: z.boolean().default(true),
  photo_data_url: z.string().max(2_500_000).optional().or(z.literal("")),
});

export type DoctorJoinInput = z.infer<typeof doctorJoinSchema>;

const SPECIALTIES = [
  "طب عام", "باطنية", "أطفال", "نساء وتوليد", "جلدية", "عيون",
  "أنف وأذن وحنجرة", "أسنان", "قلبية", "عظام", "جراحة عامة", "نفسية",
  "أعصاب", "مسالك بولية", "غدد وسكري", "أشعة",
];
const CITIES = ["عدن", "المكلا", "تعز", "الحديدة", "صنعاء", "إب", "ذمار", "أخرى"];

const INITIAL: DoctorJoinInput = {
  full_name: "", specialty: "", city: "عدن", clinic: "", phone: "", email: "",
  working_hours: "", notes: "", request_verification: true, photo_data_url: "",
};

export function DoctorJoinForm({
  onSubmit,
}: {
  onSubmit: (data: DoctorJoinInput) => Promise<void>;
}) {
  const [form, setForm] = useState<DoctorJoinInput>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [photoName, setPhotoName] = useState<string>("");

  const set = <K extends keyof DoctorJoinInput>(k: K, v: DoctorJoinInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((x) => ({ ...x, photo_data_url: "الحد الأقصى 2MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("photo_data_url", String(reader.result ?? ""));
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = doctorJoinSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[i.path[0] as string] = i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
      setDone(true);
      setForm(INITIAL);
      setPhotoName("");
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : "تعذّر الإرسال" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center" dir="rtl">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h3 className="mt-3 text-lg font-black">تم استلام طلبك</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          سيراجع فريقنا معلوماتك ونطلب مستندات التحقق قريباً. نشكر انضمامك إلى شبكة المسلي الصحية.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold hover:bg-accent"
        >
          إرسال طلب آخر
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="space-y-4" noValidate>
      <Field label="الاسم الكامل *" error={errors.full_name}>
        <input
          className={inputCls}
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          autoComplete="name"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="التخصص *" error={errors.specialty}>
          <select className={inputCls} value={form.specialty} onChange={(e) => set("specialty", e.target.value)}>
            <option value="">اختر التخصص</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="المدينة *" error={errors.city}>
          <select className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="العيادة أو المستشفى *" error={errors.clinic}>
        <input className={inputCls} value={form.clinic} onChange={(e) => set("clinic", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الهاتف *" error={errors.phone}>
          <input
            className={inputCls}
            inputMode="tel"
            dir="ltr"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+9677xxxxxxxx"
            autoComplete="tel"
          />
        </Field>
        <Field label="البريد الإلكتروني (اختياري)" error={errors.email}>
          <input
            className={inputCls}
            type="email"
            dir="ltr"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="ساعات العمل *" error={errors.working_hours}>
        <input
          className={inputCls}
          value={form.working_hours}
          onChange={(e) => set("working_hours", e.target.value)}
          placeholder="مثال: السبت–الخميس 4–9 مساءً"
        />
      </Field>

      <Field label="الصورة الشخصية (اختياري، ≤ 2MB)" error={errors.photo_data_url}>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
          <Upload className="size-4" />
          <span>{photoName || "اختر صورة"}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
        </label>
        {form.photo_data_url && (
          <img
            src={form.photo_data_url}
            alt="معاينة الصورة"
            className="mt-2 size-20 rounded-full border border-border object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </Field>

      <Field label="ملاحظات إضافية (اختياري)" error={errors.notes}>
        <textarea
          className={`${inputCls} min-h-24`}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.request_verification}
          onChange={(e) => set("request_verification", e.target.checked)}
        />
        أرغب في التحقق من هويتي المهنية (Verification)
      </label>

      {errors._form && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errors._form}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        إرسال الطلب
      </button>
    </form>
  );
}

const inputCls =
  "w-full min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default DoctorJoinForm;
