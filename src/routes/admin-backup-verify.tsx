import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyBackups, listBackupVerificationRuns } from "@/lib/backup-verification.functions";

export const Route = createFileRoute("/admin-backup-verify")({
  head: () => ({ meta: [{ title: "Backup Verification — Admin" }] }),
  component: () => (<AdminGate><BackupVerifyPage /></AdminGate>),
});

function BackupVerifyPage() {
  const verifyFn = useServerFn(verifyBackups);
  const listFn = useServerFn(listBackupVerificationRuns);
  const qc = useQueryClient();

  const latest = useQuery({
    queryKey: ["backup_verify_latest"],
    queryFn: () => verifyFn({ data: { limit: 10 } }),
    refetchInterval: 60_000,
  });

  const history = useQuery({
    queryKey: ["backup_verify_history"],
    queryFn: () => listFn({ data: { limit: 30 } }),
    refetchInterval: 60_000,
  });

  const runNow = useMutation({
    mutationFn: () => verifyFn({ data: { limit: 10 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup_verify_latest"] });
      qc.invalidateQueries({ queryKey: ["backup_verify_history"] });
    },
  });

  const data = latest.data;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التحقق من النسخ الاحتياطية</h1>
        <div className="flex gap-2">
          <button
            onClick={() => runNow.mutate()}
            disabled={runNow.isPending}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {runNow.isPending ? "جارٍ التشغيل..." : "تشغيل الآن"}
          </button>
          <button
            onClick={() => { latest.refetch(); history.refetch(); }}
            className="px-3 py-1 rounded border text-sm"
          >
            تحديث
          </button>
        </div>
      </header>

      {latest.isLoading && <div className="text-muted-foreground">جارٍ الفحص...</div>}
      {latest.error && <div className="text-destructive text-sm">{(latest.error as Error).message}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="مفحوصة" value={data.checked} />
            <Stat label="ناجحة" value={data.passed} tone="ok" />
            <Stat label="فاشلة" value={data.failed} tone={data.failed > 0 ? "warn" : "ok"} />
            <Stat
              label="حداثة آخر نسخة يومية"
              value={data.freshness_ok ? "✓ حديثة" : "✗ متأخرة"}
              tone={data.freshness_ok ? "ok" : "warn"}
            />
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">آخر فحص</h2>
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
                      <td className={`p-2 text-xs font-bold ${r.passed ? "text-emerald-600" : "text-destructive"}`}>
                        {r.passed ? "✓ سليمة" : "✗ مشكلة"}
                      </td>
                      <td className="p-2 text-xs">{r.issues.length === 0 ? "—" : r.issues.join(", ")}</td>
                    </tr>
                  ))}
                  {data.results.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">لا توجد نسخ احتياطية.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">سجل عمليات التحقق</h2>
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-right p-2">التاريخ</th>
                <th className="text-right p-2">المصدر</th>
                <th className="text-right p-2">مفحوصة</th>
                <th className="text-right p-2">ناجحة</th>
                <th className="text-right p-2">فاشلة</th>
                <th className="text-right p-2">الحداثة</th>
                <th className="text-right p-2">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {history.data?.rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.ran_at).toLocaleString("ar")}</td>
                  <td className="p-2 text-xs">{r.source}</td>
                  <td className="p-2 text-xs">{r.checked}</td>
                  <td className="p-2 text-xs text-emerald-600">{r.passed}</td>
                  <td className={`p-2 text-xs ${r.failed > 0 ? "text-destructive font-bold" : ""}`}>{r.failed}</td>
                  <td className={`p-2 text-xs ${r.freshness_ok ? "text-emerald-600" : "text-amber-600"}`}>
                    {r.freshness_ok ? "✓" : "✗"}
                  </td>
                  <td className="p-2 font-mono text-[10px] text-muted-foreground">
                    {r.correlation_id ? r.correlation_id.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
              {(!history.data || history.data.rows.length === 0) && (
                <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">لا توجد عمليات تحقق مسجّلة بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
