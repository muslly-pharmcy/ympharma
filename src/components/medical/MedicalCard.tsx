import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MedicalCardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
  children: ReactNode;
}

/**
 * MedicalCard — base surface for all Muslly Medical cards.
 * Uses tokens defined in src/styles.css (@utility medical-card).
 */
export const MedicalCard = forwardRef<HTMLDivElement, MedicalCardProps>(
  ({ interactive = false, padded = true, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "medical-card",
        interactive && "medical-card-hover cursor-pointer",
        padded && "p-4 sm:p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);
MedicalCard.displayName = "MedicalCard";

export default MedicalCard;
