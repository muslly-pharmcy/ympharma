import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listJoinSubmissions } from "@/modules/doctors/api/join-admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/doctor-join-queue")({
  head: () => ({ meta: [{ title: "طلبات انضمام الأطباء" }] }),
  component: JoinQueue,
});

function JoinQueue() {
  const fn = useServerFn(listJoinSubmissions);
  const { data, isLoading, error } = useQuery({
    queryKey: ["hc-join-queue", "new"],
    queryFn: () => fn({ data: { status: "new", page: 1, page_size: 25 } }),
  });

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader><CardTitle>طلبات الانضمام الجديدة</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p>جاري التحميل...</p>}
          {error && <p className="text-destructive">{(error as Error).message}</p>}
          {data && (
            <div className="space-y-2">
              {data.rows.length === 0 && <p className="text-muted-foreground">لا يوجد طلبات جديدة</p>}
              {data.rows.map((r) => (
                <div key={r.id} className="border rounded p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.full_name_ar}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.city ?? "-"} · {r.phone ?? "بدون هاتف"}
                    </div>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-3">
                المجموع: {data.total} · الإجراءات (موافقة/رفض) تستخدم approveJoinSubmission / rejectJoinSubmission — واجهة التفاصيل قيد الإنشاء.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
