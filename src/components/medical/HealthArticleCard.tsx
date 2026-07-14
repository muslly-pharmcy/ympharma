import { Clock } from "lucide-react";
import { MedicalCard } from "./MedicalCard";
import { cn } from "@/lib/utils";

export interface HealthArticleCardProps {
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  readMinutes?: number | null;
  tag?: string | null;
  href?: string;
  className?: string;
}

export function HealthArticleCard({
  title, excerpt, coverUrl, readMinutes, tag, href, className,
}: HealthArticleCardProps) {
  const body = (
    <article dir="rtl" className="flex flex-col gap-3">
      {coverUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[color:var(--color-medical-surface)]">
          <img src={coverUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          {tag && <span className="medical-pill absolute end-2 top-2 bg-white/90 backdrop-blur-sm">{tag}</span>}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black text-[color:var(--color-medical-ink)] sm:text-base">{title}</h3>
        {excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{excerpt}</p>}
        {readMinutes != null && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> {readMinutes} دقائق قراءة
          </p>
        )}
      </div>
    </article>
  );
  if (href) {
    return (
      <a href={href} className={cn("block medical-focus-ring", className)}>
        <MedicalCard interactive>{body}</MedicalCard>
      </a>
    );
  }
  return <MedicalCard className={className}>{body}</MedicalCard>;
}

export default HealthArticleCard;
