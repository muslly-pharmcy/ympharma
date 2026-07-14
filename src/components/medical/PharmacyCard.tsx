import { MapPin, Store } from "lucide-react";
import { MedicalCard } from "./MedicalCard";
import { cn } from "@/lib/utils";

export interface PharmacyCardProps {
  name: string;
  city?: string | null;
  comingSoon?: boolean;
  href?: string;
  className?: string;
}

export function PharmacyCard({ name, city, comingSoon, href, className }: PharmacyCardProps) {
  const body = (
    <div dir="rtl" className="flex items-center gap-3">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--color-medical-turquoise-soft)] text-[color:var(--color-medical-turquoise-deep)]">
        <Store className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-black text-[color:var(--color-medical-ink)]">{name}</h3>
          {comingSoon && <span className="medical-pill">قريباً</span>}
        </div>
        {city && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {city}
          </p>
        )}
      </div>
    </div>
  );
  if (href && !comingSoon) {
    return (
      <a href={href} className={cn("block medical-focus-ring", className)}>
        <MedicalCard interactive>{body}</MedicalCard>
      </a>
    );
  }
  return <MedicalCard className={className}>{body}</MedicalCard>;
}

export default PharmacyCard;
