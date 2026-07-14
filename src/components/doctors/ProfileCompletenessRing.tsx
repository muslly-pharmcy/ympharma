export function ProfileCompletenessRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = pct >= 80 ? "stroke-emerald-500" : pct >= 50 ? "stroke-primary" : "stroke-amber-500";
  return (
    <div className="inline-flex items-center gap-3" dir="rtl">
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`اكتمال الملف ${pct}%`}>
        <circle cx="44" cy="44" r={r} strokeWidth="8" className="fill-none stroke-muted" />
        <circle
          cx="44" cy="44" r={r}
          strokeWidth="8"
          className={`fill-none ${color} transition-all`}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="49" textAnchor="middle" className="fill-foreground text-lg font-black">
          {pct}%
        </text>
      </svg>
      <div>
        <div className="text-sm font-bold">اكتمال الملف</div>
        <div className="text-xs text-muted-foreground">
          {pct >= 80 ? "ممتاز" : pct >= 50 ? "جيد — يمكن تحسينه" : "يحتاج إكمالاً"}
        </div>
      </div>
    </div>
  );
}
