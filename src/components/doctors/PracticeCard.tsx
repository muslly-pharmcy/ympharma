import { MapPin, Phone, MessageCircle, Clock, Building2 } from "lucide-react";

const PRACTICE_TYPE_LABEL: Record<string, string> = {
  gov_hospital: "مستشفى حكومي",
  private_hospital: "مستشفى خاص",
  military_hospital: "مستشفى عسكري",
  teaching_hospital: "مستشفى جامعي",
  clinic: "عيادة",
  medical_center: "مركز طبي",
  charity: "جمعية خيرية",
  ngo: "منظمة",
};

const BOOKING_LABEL: Record<string, string> = {
  walk_in: "بدون موعد",
  phone: "حجز هاتفي",
  whatsapp: "واتساب",
  online: "حجز إلكتروني",
  assistant: "عبر السكرتير",
};

export type PracticeCardProps = {
  practice_type: string;
  booking_method: string;
  phone?: string | null;
  whatsapp?: string | null;
  consultation_duration_min?: number | null;
  is_primary?: boolean;
  location?: {
    name_ar: string;
    city?: string | null;
    governorate?: string | null;
    address?: string | null;
  } | null;
  working_hours?: Record<string, { open?: string | null; close?: string | null; closed?: boolean } | null> | null;
};

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function PracticeCard(p: PracticeCardProps) {
  const hours = p.working_hours ?? {};
  const openDays = Object.entries(hours).filter(([, v]) => v && !v.closed && v.open && v.close);
  return (
    <article
      dir="rtl"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black">
            {p.location?.name_ar ?? "موقع"}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3.5" aria-hidden />
            {PRACTICE_TYPE_LABEL[p.practice_type] ?? p.practice_type}
            {p.location?.city ? <> · <MapPin className="size-3.5" aria-hidden /> {p.location.city}</> : null}
          </p>
        </div>
        {p.is_primary ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">أساسية</span>
        ) : null}
      </header>

      {p.location?.address ? (
        <p className="mt-2 text-xs text-muted-foreground">{p.location.address}</p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          <span>{BOOKING_LABEL[p.booking_method] ?? p.booking_method}</span>
        </div>
        {p.consultation_duration_min ? (
          <div className="text-muted-foreground">{p.consultation_duration_min} دقيقة/كشف</div>
        ) : null}
      </dl>

      {openDays.length > 0 ? (
        <ul className="mt-3 space-y-0.5 text-xs">
          {openDays.slice(0, 4).map(([day, v]) => (
            <li key={day} className="flex justify-between">
              <span className="text-muted-foreground">{DAYS_AR[Number(day)] ?? day}</span>
              <span className="font-mono">{v?.open}–{v?.close}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {p.phone ? (
          <a
            href={`tel:${p.phone}`}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold hover:bg-accent"
          >
            <Phone className="size-3.5" aria-hidden /> {p.phone}
          </a>
        ) : null}
        {p.whatsapp ? (
          <a
            href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20"
          >
            <MessageCircle className="size-3.5" aria-hidden /> واتساب
          </a>
        ) : null}
      </div>
    </article>
  );
}
