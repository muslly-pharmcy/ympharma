// Doctor-facing dashboard shell. Shows profile completeness, trust, and appointment stats
// for the doctor row owned by the current user.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { getDoctorDashboardStats } from "@/modules/doctors/api/practices.functions";
import { TrustScoreMeter } from "@/components/doctors/TrustScoreMeter";
import { ProfileCompletenessRing } from "@/components/doctors/ProfileCompletenessRing";
import { Calendar, Users, MapPin, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  head: () => ({ meta: [{ title: "لوحة الطبيب — المسلي" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const [doctorId, setDoctorId] = useState<string | null | undefined>(undefined);
  const [doctorSlug, setDoctorSlug] = useState<string | null>(null);
  const stats = useServerFn(getDoctorDashboardStats);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) { setDoctorId(null); return; }
      const { data } = await supabase
        .from("hc_doctors")
        .select("id, slug")
        .eq("user_id", uid)
        .maybeSingle();
      if (!cancelled) {
        setDoctorId(data?.id ?? null);
        setDoctorSlug(data?.slug ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const q = useQuery({
    queryKey: ["hc-doctor-dashboard", doctorId],
    queryFn: () => stats({ data: { doctor_id: doctorId! } }),
    enabled: !!doctorId,
  });

  if (doctorId === undefined) {
    return <PageShell><Loader2 className="mx-auto size-6 animate-spin" /></PageShell>;
  }
  if (doctorId === null) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-black">ليس لديك ملف طبيب مرتبط</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سجّل طلب انضمام لينشئ الفريق ملفك المهني.
          </p>
          <Link
            to="/doctor/join"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            انضم كطبيب
          </Link>
        </div>
      </PageShell>
    );
  }

  const d = q.data?.doctor;
  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">
            أهلاً {d?.full_name_ar ?? "دكتور"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تابع اكتمال ملفك ومواعيدك من مكان واحد.
          </p>
        </div>
        {doctorSlug ? (
          <Link
            to="/doctors/$slug"
            params={{ slug: doctorSlug }}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-accent"
          >
            <ExternalLink className="size-4" /> عرض ملفي العام
          </Link>
        ) : null}
      </header>

      {q.isLoading || !d ? (
        <div className="rounded-2xl border border-border p-10 text-center">
          <Loader2 className="mx-auto size-6 animate-spin" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <ProfileCompletenessRing value={d.profile_completeness ?? 0} />
            </div>
            <TrustScoreMeter score={d.trust_score ?? 0} />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span
                  className={`inline-block size-2 rounded-full ${
                    d.verification_status === "verified" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                حالة التحقق: {d.verification_status === "verified" ? "موثّق" : d.verification_status}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                الملفات الموثّقة تظهر أعلى نتائج البحث.
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Calendar className="size-5" />} label="مواعيد قادمة" value={q.data?.appointments_upcoming ?? 0} />
            <StatCard icon={<Users className="size-5" />} label="إجمالي المواعيد" value={q.data?.appointments_total ?? 0} />
            <StatCard icon={<MapPin className="size-5" />} label="أماكن العمل النشطة" value={q.data?.practices_active ?? 0} />
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
              <div className="text-base font-black">إدارة أماكن العمل</div>
              <p className="mt-1 text-xs text-muted-foreground">
                قريباً: أضف مستشفيات وعيادات وحدد ساعات العمل وطرق الحجز.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
              <div className="text-base font-black">تحديث الملف المهني</div>
              <p className="mt-1 text-xs text-muted-foreground">
                قريباً: عدّل السيرة، الشهادات، الخدمات، والتأمينات المقبولة.
              </p>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
      <div className="mt-2 text-3xl font-black">{value.toLocaleString("ar")}</div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <main dir="rtl" className="container mx-auto max-w-5xl px-4 py-8">{children}</main>;
}
