import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/doctor/practices")({
  head: () => ({ meta: [{ title: "المواقع الطبية — الطبيب" }] }),
  component: () => (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader><CardTitle>إدارة المواقع</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            الواجهة قيد الإنشاء — الخدمات الخلفية جاهزة (listMyPractices / upsertPractice / deletePractice).
          </p>
        </CardContent>
      </Card>
    </div>
  ),
});
