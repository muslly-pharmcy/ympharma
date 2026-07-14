import { useNavigate } from "@tanstack/react-router";
import { Search, Pill, Stethoscope, BookOpen } from "lucide-react";
import { useState } from "react";
import { normalizeAr as normalizeDoctorQuery } from "@/modules/doctors";
import { normalizeMedicineQuery } from "@/modules/catalog";
import { trackEvent } from "../analytics/track";

type Category = "medicines" | "doctors" | "content";

const CATEGORIES: { id: Category; label: string; icon: typeof Pill; hint: string }[] = [
  { id: "medicines", label: "أدوية", icon: Pill, hint: "ابحث عن دواء أو مكمل غذائي" },
  { id: "doctors", label: "أطباء", icon: Stethoscope, hint: "ابحث عن طبيب حسب التخصص أو الاسم" },
  { id: "content", label: "محتوى صحي", icon: BookOpen, hint: "ابحث في المقالات والنصائح الطبية" },
];

export function UnifiedSearch({ compact = false }: { compact?: boolean }) {
  const [cat, setCat] = useState<Category>("medicines");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const active = CATEGORIES.find((c) => c.id === cat)!;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = q.trim();
    const query = cat === "medicines" ? normalizeMedicineQuery(raw) : normalizeDoctorQuery(raw);
    if (!query && cat === "medicines") return;
    trackEvent("search_submitted", { category: cat, length: query.length });
    if (cat === "medicines") navigate({ to: "/products", search: { q: query } as never });
    else if (cat === "doctors") navigate({ to: "/doctors", search: { q: query, specialty: "", city: "", facility: "", page: 1 } });
    else navigate({ to: "/sahtak" });
  };

  return (
    <form
      onSubmit={onSubmit}
      dir="rtl"
      className={`rounded-2xl border border-border bg-card p-3 shadow-card ${compact ? "" : "sm:p-4"}`}
      role="search"
      aria-label="البحث الموحّد"
    >
      <div role="tablist" aria-label="فئة البحث" className="mb-2 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = c.id === cat;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { setCat(c.id); trackEvent("search_category_changed", { category: c.id }); }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="size-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="sr-only" htmlFor="unified-search-input">{active.hint}</label>
        <input
          id="unified-search-input"
          type="search"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={active.hint}
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary-deep"
          aria-label="بحث"
        >
          <Search className="size-4" />
          بحث
        </button>
      </div>
    </form>
  );
}

export default UnifiedSearch;
