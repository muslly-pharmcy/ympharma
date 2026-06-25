import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function GradientText({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "bg-gradient-to-br from-primary via-primary-deep to-[color:var(--titans-gold)] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
