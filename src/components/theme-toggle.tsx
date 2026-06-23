import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع المظلم"}
      title={isDark ? "الوضع الفاتح" : "الوضع المظلم"}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-primary-foreground ring-1 ring-white/25 transition hover:bg-white/25 " +
        (className ?? "")
      }
    >
      {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </button>
  );
}
