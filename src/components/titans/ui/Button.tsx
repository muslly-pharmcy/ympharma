import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface TitansButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 shadow-lg shadow-foreground/10",
  secondary:
    "bg-[color:var(--titans-gold)] text-background hover:opacity-90 shadow-lg shadow-[color:var(--titans-gold)]/20",
  outline:
    "border border-border/60 text-foreground hover:bg-foreground/5 backdrop-blur-sm",
  ghost: "text-foreground hover:bg-foreground/5",
};

export const Button = forwardRef<HTMLButtonElement, TitansButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "TitansButton";
