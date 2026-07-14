import { MapPin, Stethoscope } from "lucide-react";
import { MedicalCard } from "./MedicalCard";
import { TrustBadge } from "./TrustBadge";
import { cn } from "@/lib/utils";

export interface DoctorCardProps {
  name: string;
  specialty?: string | null;
  city?: string | null;
  photoUrl?: string | null;
  verified?: boolean;
  rating?: number | null;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function DoctorCard({
  name, specialty, city, photoUrl, verified, rating, href, onClick, className,
}: DoctorCardProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  const content = (
    <div dir="rtl" className="flex items-start gap-3">
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[color:var(--color-medical-turquoise-soft)] text-[color:var(--color-medical-turquoise-deep)] text-lg font-black">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span aria-hidden>{initials || "د"}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-sm font-black text-[color:var(--color-medical-ink)]">{name}</h3>
          {verified && <TrustBadge variant="verified" />}
          {rating != null && <TrustBadge variant="rating" value={rating.toFixed(1)} label="" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {specialty && (
            <span className="inline-flex items-center gap-1"><Stethoscope className="size-3.5" aria-hidden />{specialty}</span>
          )}
          {city && (
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{city}</span>
          )}
        </div>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className={cn("block medical-focus-ring", className)} aria-label={`عرض ملف الطبيب ${name}`}>
        <MedicalCard interactive>{content}</MedicalCard>
      </a>
    );
  }
  return (
    <MedicalCard interactive={!!onClick} onClick={onClick} className={className}>
      {content}
    </MedicalCard>
  );
}

export default DoctorCard;
