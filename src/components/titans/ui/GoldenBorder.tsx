import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function GoldenBorder({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl p-[1.5px]",
        "bg-gradient-to-br from-[color:var(--titans-gold)] via-primary to-[color:var(--titans-gold)]",
        className,
      )}
    >
      <div className="rounded-3xl bg-background">{children}</div>
    </div>
  );
}
