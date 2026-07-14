import { Search, X } from "lucide-react";

export type FiltersValue = { q: string; specialty: string; city: string; facility: string };

export function DoctorFilters({
  value, onChange, specialties, cities, facilities,
}: {
  value: FiltersValue;
  onChange: (v: Partial<FiltersValue>) => void;
  specialties: Array<{ code: string; name_ar: string }>;
  cities: string[];
  facilities: string[];
}) {
  const hasAny = value.q || value.specialty || value.city || value.facility;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="ابحث عن طبيب أو تخصص…"
          className="w-full rounded-xl border border-border bg-background py-2.5 pe-9 ps-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={value.specialty} onChange={(e) => onChange({ specialty: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">كل التخصصات</option>
          {specialties.map((s) => <option key={s.code} value={s.code}>{s.name_ar}</option>)}
        </select>
        <select value={value.city} onChange={(e) => onChange({ city: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">كل المدن</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={value.facility} onChange={(e) => onChange({ facility: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">كل المرافق</option>
          {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {hasAny && (
        <button
          onClick={() => onChange({ q: "", specialty: "", city: "", facility: "" })}
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" /> مسح كل الفلاتر
        </button>
      )}
    </div>
  );
}
