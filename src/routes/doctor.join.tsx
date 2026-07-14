import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, ArrowRight, ShieldCheck } from "lucide-react";
import DoctorJoinForm, { type DoctorJoinInput } from "@/modules/doctors/components/DoctorJoinForm";

export const Route = createFileRoute("/doctor/join")({
  head: () => ({
    meta: [
      { title: "انضم كطبيب — شبكة المسلي الصحية" },
      { name: "description", content: "أطباء عدن واليمن: انضموا إلى شبكة المسلي الصحية واستقبلوا مرضى جدد بعد التحقق من الملف المهني." },
      { property: "og:title", content: "انضم كطبيب — شبكة المسلي الصحية" },
      { property: "og:description", content: "سجّل ملفك المهني وابدأ استقبال المرضى عبر منصة المسلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorJoinPage,
});

async function submitDoctorJoin(data: DoctorJoinInput) {
  const res = await fetch("/api/public/doctor-join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error === "validation" ? "بيانات غير مكتملة" : "تعذّر الإرسال، حاول لاحقاً");
  }
}

function DoctorJoinPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <section className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span>انضم كطبيب</span>
        </nav>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Stethoscope className="size-7" aria-hidden />
          </div>
          <h1 className="text-3xl font-black md:text-4xl">انضم كطبيب إلى شبكة المسلي</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            سجّل ملفك المهني في دقائق. بعد التحقق، يظهر ملفك في نتائج البحث وتصلك حجوزات المرضى مباشرة.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs font-bold text-emerald-700">
            <ShieldCheck className="size-4" /> جميع الأطباء يمرّون بتحقق مهني قبل النشر
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-8">
          <DoctorJoinForm onSubmit={submitDoctorJoin} />
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/doctors" className="inline-flex items-center gap-1 hover:text-primary">
            تصفّح الأطباء الحاليين <ArrowRight className="size-3.5" />
          </Link>
          <Link to="/contact" className="hover:text-primary">استفسار قبل التسجيل</Link>
        </div>
      </section>
    </main>
  );
}
