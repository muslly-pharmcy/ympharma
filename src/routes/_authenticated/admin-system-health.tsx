// Admin UI: live system health snapshot, polls /api/public/monitoring/health.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin-system-health")({
  head: () => ({
    meta: [
      { title: "صحة النظام — لوحة الإدارة" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSystemHealthPage,
});

type CheckStatus = "ok" | "warning" | "critical" | "error";
type Check = { status: CheckStatus; [k: string]: unknown };
type Snapshot = {
  ok: boolean;
  overall_status: CheckStatus;
  timestamp: string;
  elapsed_ms: number;
  checks: Record<string, Check>;
};

const TONE: Record<CheckStatus, "default" | "secondary" | "destructive"> = {
  ok: "default",
  warning: "secondary",
  critical: "destructive",
  error: "destructive",
};

const LABELS: Record<string, string> = {
  database: "قاعدة البيانات",
  event_queue: "طابور الأحداث",
  dlq: "الأحداث الفاشلة (DLQ)",
  error_rate: "معدل الأخطاء",
  low_stock: "مخزون منخفض",
  snapshot: "اللقطة",
};

function AdminSystemHealthPage() {
  const q = useQuery<Snapshot>({
    queryKey: ["system-health-snapshot"],
    queryFn: async () => {
      const r = await fetch("/api/public/monitoring/health");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-4" dir="rtl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">صحة النظام</h1>
        {q.data && (
          <Badge variant={TONE[q.data.overall_status]}>
            {q.data.overall_status.toUpperCase()}
          </Badge>
        )}
      </header>

      {q.isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
      {q.error && (
        <Card className="p-4 border-destructive">
          <p className="text-destructive">
            فشل التحميل: {q.error instanceof Error ? q.error.message : String(q.error)}
          </p>
        </Card>
      )}

      {q.data && (
        <>
          <p className="text-sm text-muted-foreground">
            آخر فحص: {new Date(q.data.timestamp).toLocaleTimeString("ar")} —{" "}
            {q.data.elapsed_ms}ms
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(q.data.checks).map(([key, check]) => {
              const { status, ...rest } = check;
              return (
                <Card key={key} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{LABELS[key] ?? key}</h3>
                    <Badge variant={TONE[status]}>{status}</Badge>
                  </div>
                  {Object.keys(rest).length > 0 && (
                    <dl className="text-sm space-y-1">
                      {Object.entries(rest).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-mono">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
