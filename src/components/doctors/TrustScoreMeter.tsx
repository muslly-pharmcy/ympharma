import { ShieldCheck } from "lucide-react";

export function TrustScoreMeter({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const label = pct >= 80 ? "موثوق عالياً" : pct >= 60 ? "موثوق" : pct >= 40 ? "قيد التحقق" : "غير موثّق";
  const color = pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-primary" : pct >= 40 ? "text-amber-600" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className={`size-5 ${color}`} aria-hidden />
          <span>مؤشر الثقة</span>
        </div>
        <span className={`text-lg font-black ${color}`}>{pct}</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : pct >= 40 ? "bg-amber-500" : "bg-muted-foreground"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-xs ${color}`}>{label}</p>
    </div>
  );
}
