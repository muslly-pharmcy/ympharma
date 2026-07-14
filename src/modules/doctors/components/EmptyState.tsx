import { Stethoscope } from "lucide-react";

export function EmptyState({ title = "لا توجد نتائج مطابقة", hint = "جرّب تعديل الفلاتر أو الكلمات المفتاحية" }: { title?: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Stethoscope className="mb-2 size-8 text-muted-foreground" />
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
