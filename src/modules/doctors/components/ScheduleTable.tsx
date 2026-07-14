const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export type Slot = { id: string; weekday: number; start_time: string; end_time: string; is_active: boolean; location_id: string };

export function ScheduleTable({ slots, locations }: { slots: Slot[]; locations: Array<{ id: string; name_ar: string }> }) {
  const active = slots.filter((s) => s.is_active);
  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">لم يتم تحديد مواعيد بعد.</p>;
  }
  const locMap = new Map(locations.map((l) => [l.id, l.name_ar]));
  const byDay = new Map<number, Slot[]>();
  for (const s of active) {
    const arr = byDay.get(s.weekday) ?? [];
    arr.push(s);
    byDay.set(s.weekday, arr);
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {[...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, items]) => (
        <li key={day} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-bold text-primary-deep">{DAYS_AR[day] ?? `يوم ${day}`}</span>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {items.map((s) => (
              <span key={s.id} className="rounded-full bg-muted px-2 py-0.5">
                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                {locMap.get(s.location_id) ? ` · ${locMap.get(s.location_id)}` : ""}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
