import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

export type TrustLevel = "A" | "B" | "C" | "D";

export function computeTrustLevel(input: { verification_status: string; metadata?: Record<string, unknown> | null }): TrustLevel {
  const tier = (input.metadata as any)?.source_tier as string | undefined;
  if (input.verification_status === "verified") {
    if (tier === "hospital" || tier === "doctor") return "A";
    if (tier === "official") return "B";
    return "B";
  }
  if (tier === "public") return "C";
  return "D";
}

const CFG: Record<TrustLevel, { label: string; hint: string; className: string; Icon: any }> = {
  A: { label: "موثّق A", hint: "بيانات مؤكّدة من الطبيب أو المستشفى",     className: "bg-emerald-50 text-emerald-700 border-emerald-200",  Icon: ShieldCheck },
  B: { label: "موثّق B", hint: "بيانات من مصدر رسمي معتمد",              className: "bg-sky-50 text-sky-700 border-sky-200",              Icon: ShieldCheck },
  C: { label: "قيد التحقق C", hint: "بيانات عامة قابلة للمراجعة",         className: "bg-amber-50 text-amber-700 border-amber-200",         Icon: ShieldAlert },
  D: { label: "غير مؤكد D", hint: "بحاجة لمراجعة — أبلغ عن أي خطأ",       className: "bg-slate-100 text-slate-700 border-slate-200",        Icon: ShieldQuestion },
};

export function TrustBadge({ level }: { level: TrustLevel }) {
  const c = CFG[level];
  const Icon = c.Icon;
  return (
    <span title={c.hint} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${c.className}`}>
      <Icon className="size-3" /> {c.label}
    </span>
  );
}
