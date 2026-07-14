import { Link } from "@tanstack/react-router";
import { MapPin, Stethoscope, Clock3 } from "lucide-react";
import type { PublicDoctorRow } from "../server/doctors.functions";
import { computeTrustLevel, TrustBadge } from "./TrustBadge";

export function DoctorCard({ d }: { d: PublicDoctorRow }) {
  const primarySpec = d.specialties.find((s) => s.is_primary) ?? d.specialties[0];
  const primaryLoc = d.locations[0];
  const trust = computeTrustLevel(d);
  return (
    <Link
      to="/doctors/$slug"
      params={{ slug: d.slug }}
      className="group relative flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        {d.photo_url ? (
          <img src={d.photo_url} alt={d.full_name_ar} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Stethoscope className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-black leading-tight">{d.title ? `${d.title} ` : "د. "}{d.full_name_ar}</h3>
          <TrustBadge level={trust} />
        </div>
        {primarySpec && (
          <div className="mt-1 flex items-center gap-1 text-sm text-primary-deep">
            <Stethoscope className="size-3.5" /> {primarySpec.name_ar}
          </div>
        )}
        {primaryLoc && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {primaryLoc.name_ar}{primaryLoc.city ? ` — ${primaryLoc.city}` : ""}
          </div>
        )}
        {d.years_experience != null && d.years_experience > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" /> {d.years_experience} سنة خبرة
          </div>
        )}
      </div>
    </Link>
  );
}
