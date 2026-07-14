import { MedicalCard } from "./MedicalCard";
import { cn } from "@/lib/utils";

export interface MedicineCardProps {
  nameAr: string;
  nameEn?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string;
  inStock?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function MedicineCard({
  nameAr, nameEn, imageUrl, price, currency = "﷼", inStock = true,
  href, onClick, className,
}: MedicineCardProps) {
  const inner = (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[color:var(--color-medical-surface)]">
        {imageUrl ? (
          <img src={imageUrl} alt={nameAr} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground text-xs">لا توجد صورة</div>
        )}
        <span
          className={cn(
            "absolute end-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
            inStock ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white",
          )}
        >
          {inStock ? "متوفر" : "غير متوفر"}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-bold text-[color:var(--color-medical-ink)]">{nameAr}</h3>
        {nameEn && <p className="mt-0.5 truncate text-xs text-muted-foreground">{nameEn}</p>}
        {price != null && (
          <p className="mt-2 text-base font-black text-[color:var(--color-medical-turquoise-deep)]">
            {price.toLocaleString("ar-YE")} <span className="text-xs font-bold">{currency}</span>
          </p>
        )}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className={cn("block medical-focus-ring", className)}>
        <MedicalCard interactive padded>{inner}</MedicalCard>
      </a>
    );
  }
  return (
    <MedicalCard interactive={!!onClick} padded onClick={onClick} className={className}>
      {inner}
    </MedicalCard>
  );
}

export default MedicineCard;
