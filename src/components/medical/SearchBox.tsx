import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SearchBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  label?: string;
}

/**
 * SearchBox — presentation shell around a search input.
 * Business logic (navigation, normalization) stays in the parent.
 */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ onSearch, label, className, placeholder = "ابحث…", ...rest }, ref) => (
    <form
      dir="rtl"
      role="search"
      className={cn(
        "medical-card flex items-center gap-2 p-1.5 shadow-medical-card",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const value = (e.currentTarget.elements.namedItem("q") as HTMLInputElement | null)?.value ?? "";
        onSearch?.(value.trim());
      }}
    >
      {label && <span className="sr-only">{label}</span>}
      <input
        ref={ref}
        name="q"
        type="search"
        inputMode="search"
        placeholder={placeholder}
        className="min-h-11 flex-1 rounded-xl bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground medical-focus-ring"
        {...rest}
      />
      <button
        type="submit"
        aria-label="بحث"
        className="medical-tap inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--color-medical-turquoise)] px-4 text-sm font-black text-white transition hover:bg-[color:var(--color-medical-turquoise-deep)]"
      >
        <Search className="size-4" aria-hidden />
        بحث
      </button>
    </form>
  ),
);
SearchBox.displayName = "SearchBox";

export default SearchBox;
