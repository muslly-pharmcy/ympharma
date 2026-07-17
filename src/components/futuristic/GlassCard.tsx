import { cn } from "@/lib/utils";
import type { HTMLAttributes, PropsWithChildren } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "dark";
  glow?: boolean;
}

/**
 * Glass Morphism 3.0 container.
 * Uses `.glass-3` / `.glass-3-dark` utilities defined in src/styles.css.
 */
export function GlassCard({
  variant = "light",
  glow,
  className,
  children,
  ...rest
}: PropsWithChildren<GlassCardProps>) {
  return (
    <div
      className={cn(
        variant === "dark" ? "glass-3-dark" : "glass-3",
        glow && "ai-glow",
        "p-5 transition-all duration-[400ms] ease-out",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
