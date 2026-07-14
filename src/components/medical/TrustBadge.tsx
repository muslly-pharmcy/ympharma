import { ShieldCheck, BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "verified" | "licensed" | "rating";

export interface TrustBadgeProps {
  variant?: Variant;
  label?: string;
  value?: string | number;
  className?: string;
}

const CONFIG: Record<Variant, { icon: typeof ShieldCheck; label: string; tone: string }> = {
  verified: { icon: BadgeCheck, label: "موثّق", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  licensed: { icon: ShieldCheck, label: "مرخّص", tone: "text-sky-700 bg-sky-50 border-sky-200" },
  rating: { icon: Star, label: "تقييم", tone: "text-amber-700 bg-amber-50 border-amber-200" },
};

export function TrustBadge({ variant = "verified", label, value, className }: TrustBadgeProps) {
  const c = CONFIG[variant];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
        c.tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label ?? c.label}
      {value !== undefined && <span className="tabular-nums">{value}</span>}
    </span>
  );
}

export default TrustBadge;
