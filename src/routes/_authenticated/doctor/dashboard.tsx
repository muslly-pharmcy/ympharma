import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDoctorProfile } from "@/modules/doctors/api/profile.functions";
import { getDoctorDashboardStats } from "@/modules/doctors/api/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  head: () => ({ meta: [{ title: "لوحة الطبيب — Phoenix" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const myProfile = useServerFn(getMyDoctorProfile);
  const { data: doctor, isLoading } = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => myProfile(),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4" dir="rtl">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardHeader><CardTitle>لا يوجد ملف طبيب مرتبط بحسابك</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              يمكنك التقديم للانضمام كطبيب على منصة Phoenix.
            </p>
            <Button asChild><Link to="/doctor/join">التقديم للانضمام</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <DoctorDashboardInner doctorId={doctor.id} verificationStatus={doctor.verification_status} isPublic={doctor.is_public} />;
}

function DoctorDashboardInner({ doctorId, verificationStatus, isPublic }: { doctorId: string; verificationStatus: string; isPublic: boolean }) {
  const statsFn = useServerFn(getDoctorDashboardStats);
  const { data: stats } = useSuspenseQuery({
    queryKey: ["doctor-stats", doctorId],
    queryFn: () => statsFn({ data: { doctor_id: doctorId } }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">لوحة الطبيب</h1>
        <div className="flex gap-2">
          <Badge variant={verificationStatus === "verified" ? "default" : "secondary"}>
            {verificationStatus === "verified" ? "موثّق" : "قيد المراجعة"}
          </Badge>
          <Badge variant={isPublic ? "default" : "outline"}>
            {isPublic ? "منشور" : "غير منشور"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">اكتمال الملف</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{stats.profile_completeness}%</div>
            <Progress value={stats.profile_completeness} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">درجة الثقة</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{stats.trust_score}</div>
            <Progress value={stats.trust_score} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">المواقع النشطة</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.practices_active} / {stats.practices_total}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">مواعيد (30 يوم)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.appointments_30d}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">مواعيد مؤكدة</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.appointments_confirmed_30d}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">مواعيد مكتملة</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.appointments_completed_30d}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild><Link to="/doctor/profile">تحرير الملف الشخصي</Link></Button>
        <Button asChild variant="outline"><Link to="/doctor/practices">إدارة المواقع</Link></Button>
      </div>
    </div>
  );
}
