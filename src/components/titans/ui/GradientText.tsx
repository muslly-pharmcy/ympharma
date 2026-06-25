import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function GradientText({
  children,
  className,
  as: As = "span",
}: PropsWithChildren<{ className?: string; as?: keyof React.JSX.IntrinsicElements }>) {
  const Component = As as React.ElementType;
  return (
    <Component
      className={cn(
        "bg-gradient-to-br from-primary via-primary-deep to-[color:var(--titans-gold)] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </Component>
  );
}
