import { Link } from "@tanstack/react-router";
import { Stethoscope, ChevronLeft, ShieldCheck, MapPin } from "lucide-react";
import { trackEvent } from "../analytics/track";

export function DoctorDiscoveryEntry() {
  return (
    <section
      aria-labelledby="doctor-discovery-heading"
      dir="rtl"
      className="grid gap-4 rounded-3xl border border-border bg-gradient-to-l from-sky-50 to-white p-5 shadow-card sm:grid-cols-[1.1fr_.9fr] sm:p-6"
    >
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-700">
          <Stethoscope className="size-3.5" /> جديد
        </div>
        <h2 id="doctor-discovery-heading" className="mt-2 text-xl font-black sm:text-2xl">دليل الأطباء الموثّق</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          ابحث عن الطبيب المناسب في عدن حسب التخصص، المدينة، أو المركز الصحي — مع درجات ثقة واضحة تعتمد على مصدر التحقق.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/doctors"
            onClick={() => trackEvent("cta_clicked", { source: "doctor_discovery", target: "directory" })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground shadow-sm hover:bg-primary-deep"
          >
            تصفّح الأطباء <ChevronLeft className="size-4" />
          </Link>
          <Link
            to="/contact"
            onClick={() => trackEvent("cta_clicked", { source: "doctor_discovery", target: "join" })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
          >
            أنا طبيب — أريد الانضمام
          </Link>
        </div>
      </div>
      <ul className="grid gap-2 self-center text-sm">
        <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
          <ShieldCheck className="size-4 text-emerald-600" />
          درجات ثقة A–D حسب مصدر التحقق
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
          <MapPin className="size-4 text-sky-600" />
          تصفية حسب المدينة والمركز الصحي
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
          <Stethoscope className="size-4 text-primary" />
          تخصصات معتمدة ومحدّثة
        </li>
      </ul>
    </section>
  );
}

export default DoctorDiscoveryEntry;
