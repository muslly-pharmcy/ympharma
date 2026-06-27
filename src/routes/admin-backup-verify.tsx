import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyBackups } from "@/lib/backup-verification.functions";

export const Route = createFileRoute("/admin-backup-verify")({
  head: () => ({ meta: [{ title: "Backup Verification — Admin" }] }),
  component: () => (<AdminGate><BackupVerifyPage /></AdminGate>),
});

function BackupVerifyPage() {
  const fn = useServerFn(verifyBackups);
  const q = useQuery({
    queryKey: ["backup_verify"],
    queryFn: () => fn({ data: { limit: 10 } }),
    refetchInterval: 60_000,
  });

  const data = q.data;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التحقق من النسخ الاحتياطية</h1>
        <button onClick={() => q.refetch()} className="px-3 py-1 rounded border text-sm">تحديث</button>
      </header>

      {q.isLoading && <div className="text-muted-foreground">جارٍ الفحص...</div>}
      {q.error && <div className="text-destructive text-sm">{(q.error as Error).message}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="مفحوصة" value={data.checked} />
            <Stat label="ناجحة" value={data.passed} tone="ok" />
            <Stat label="فاشلة" value={data.failed} tone={data.failed > 0 ? "warn" : "ok"} />
            <Stat label="حداثة آخر نسخة يومية" value={data.freshness_ok ? "✓ حديثة" : "✗ متأخرة"} tone={data.freshness_ok ? "ok" : "warn"} />
          </div>

          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-right p-2">المعرّف</th>
                  <th className="text-right p-2">النوع</th>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">المشاكل</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.backup_id} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.backup_id.slice(0, 8)}</td>
                    <td className="p-2 text-xs">{r.kind}</td>
                    <td className="p-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
                    <td className={`p-2 text-xs font-bold ${r.passed ? "text-emerald-600" : "text-destructive"}`}>{r.passed ? "✓ سليمة" : "✗ مشكلة"}</td>
                    <td className="p-2 text-xs">{r.issues.length === 0 ? "—" : r.issues.join(", ")}</td>
                  </tr>
                ))}
                {data.results.length === 0 && (
                  <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">لا توجد نسخ احتياطية.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "ok" | "warn" | "neutral" }) {
  const cls = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}
