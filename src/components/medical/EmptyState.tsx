import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "medical-card flex flex-col items-center gap-3 p-8 text-center",
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-[color:var(--color-medical-turquoise-soft)] text-[color:var(--color-medical-turquoise-deep)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-black text-[color:var(--color-medical-ink)]">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
