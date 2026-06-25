import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function GlassCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/40 bg-card/50 p-6 backdrop-blur-xl shadow-card",
        "ring-1 ring-inset ring-white/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
