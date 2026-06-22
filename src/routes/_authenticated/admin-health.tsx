// Admin UI: trigger health checks + display history from health_checks table.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listHealthChecks, type HealthCheckRow } from "@/lib/inventory-sync.functions";

export const Route = createFileRoute("/_authenticated/admin-health")({
  head: () => ({
    meta: [
      { title: "فحص النظام — لوحة الإدارة" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminHealthPage,
});

type CheckResult = { status: "pass" | "fail" | "warn"; message: string; duration: number; details?: unknown };
type Report = {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  duration: number;
  checks: Record<string, CheckResult>;
  summary: { passed: number; failed: number; warnings: number; total: number };
};

const STATUS_TONE: Record<Report["status"], "default" | "secondary" | "destructive"> = {
  healthy: "default",
  degraded: "secondary",
  unhealthy: "destructive",
};

function AdminHealthPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<"full" | "quick" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listChecks = useServerFn(listHealthChecks);
  const history = useQuery({
    queryKey: ["health_checks"],
    queryFn: () => listChecks({ data: { limit: 30 } }),
  });

  async function run(kind: "full" | "quick") {
    setLoading(kind);
    setError(null);
    try {
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const r = await fetch(`/api/public/health/${kind}-check`, { headers: { apikey } });
      const j = (await r.json()) as Report;
      setReport(j);
      history.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">🔍 فحص النظام</h1>
      <div className="flex gap-2 mb-6">
        <Button onClick={() => run("quick")} disabled={loading !== null}>
          {loading === "quick" ? "جارٍ الفحص…" : "فحص سريع"}
        </Button>
        <Button onClick={() => run("full")} variant="secondary" disabled={loading !== null}>
          {loading === "full" ? "جارٍ الفحص…" : "فحص كامل"}
        </Button>
        <Button onClick={() => history.refetch()} variant="outline" disabled={history.isFetching}>
          🔄 تحديث السجل
        </Button>
      </div>

      {error && <Card className="p-4 mb-4 border-destructive text-destructive">{error}</Card>}

      {report && (
        <>
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">الحالة العامة:</span>
                <Badge variant={STATUS_TONE[report.status]}>{report.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                ✅ {report.summary.passed} · ⚠️ {report.summary.warnings} · ❌ {report.summary.failed} · ⏱ {report.duration}ms
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{new Date(report.timestamp).toLocaleString("ar")}</p>
          </Card>

          <div className="space-y-2 mb-8">
            {Object.entries(report.checks).map(([key, c]) => (
              <Card key={key} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{key}</span>
                      <Badge variant={c.status === "pass" ? "default" : c.status === "warn" ? "secondary" : "destructive"}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{c.duration}ms</span>
                </div>
                {c.details != null && (
                  <pre className="mt-2 text-[11px] bg-muted/40 rounded p-2 overflow-auto">{JSON.stringify(c.details, null, 2)}</pre>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-bold mb-3">📜 آخر عمليات الفحص</h2>
      {history.isLoading ? (
        <p className="text-sm text-muted-foreground">⏳ جاري التحميل…</p>
      ) : history.isError ? (
        <p className="text-sm text-destructive">❌ تعذر تحميل السجل</p>
      ) : (history.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد عمليات فحص مسجلة بعد.</p>
      ) : (
        <div className="space-y-2">
          {(history.data as HealthCheckRow[]).map((h) => (
            <Card key={h.id} className="p-3 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={STATUS_TONE[h.status]}>{h.status}</Badge>
                  <span className="text-xs text-muted-foreground truncate">{new Date(h.created_at).toLocaleString("ar")}</span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  ✅ {h.passed} · ⚠️ {h.warnings} · ❌ {h.failed} · ⏱ {h.duration ?? 0}ms
                </div>
              </div>
              {h.details != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">عرض التفاصيل</summary>
                  <pre className="mt-1 text-[10px] bg-muted/40 rounded p-2 overflow-auto max-h-60">
                    {JSON.stringify(h.details, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
