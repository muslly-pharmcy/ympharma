import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogs } from "@/lib/activity.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin-logs")({
  ssr: false,
  head: () => ({ meta: [{ title: "سجل النشاط — مصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><AdminLogs /></AdminGate>),
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">خطأ: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

function AdminLogs() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/admin" });
      } else {
        setReady(true);
      }
    });
    return () => { mounted = false; };
  }, [navigate]);

  const fetchLogs = useServerFn(getActivityLogs);
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => fetchLogs({ data: { limit: 200 } }),
    enabled: ready,
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سجل النشاط</h1>
          <p className="text-sm text-muted-foreground">آخر 200 عملية إدارية مسجّلة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowRight className="size-4" /> رجوع للوحة
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 mb-4">
          <CardContent className="py-4 text-destructive">{(error as Error).message}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">جارٍ التحميل…</div>
      ) : !data || data.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا يوجد نشاط بعد</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="secondary">{row.action}</Badge>
                  {row.entity_type && <span className="text-xs text-muted-foreground">{row.entity_type} · {row.entity_id}</span>}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString("ar-EG")}
                </span>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="text-muted-foreground mb-1">{row.actor_email ?? "النظام"}</div>
                {row.details && Object.keys(row.details as object).length > 0 && (
                  <pre className="bg-muted/50 p-2 rounded max-h-40 overflow-auto text-[10px] leading-tight">
                    {JSON.stringify(row.details, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
