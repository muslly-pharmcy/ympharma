import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getMyDoctorProfile, updateDoctorProfileExtras } from "@/modules/doctors/api/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/profile")({
  head: () => ({ meta: [{ title: "الملف الشخصي — الطبيب" }] }),
  component: DoctorProfileEditor,
});

function DoctorProfileEditor() {
  const getMe = useServerFn(getMyDoctorProfile);
  const update = useServerFn(updateDoctorProfileExtras);
  const qc = useQueryClient();
  const { data: doctor, isLoading } = useQuery({ queryKey: ["my-doctor-profile"], queryFn: () => getMe() });

  const [form, setForm] = useState({
    academic_title: "", medical_title: "", bio_ar: "", bio_en: "",
    sub_specialties: "", languages: "",
    consultation_fee_min: "", consultation_fee_max: "",
    intro_video_url: "",
  });

  useEffect(() => {
    if (!doctor) return;
    setForm({
      academic_title: (doctor as { academic_title?: string }).academic_title ?? "",
      medical_title: (doctor as { medical_title?: string }).medical_title ?? "",
      bio_ar: doctor.bio_ar ?? "",
      bio_en: doctor.bio_en ?? "",
      sub_specialties: ((doctor as { sub_specialties?: string[] }).sub_specialties ?? []).join(", "),
      languages: (doctor.languages ?? []).join(", "),
      consultation_fee_min: String((doctor as { consultation_fee_min?: number }).consultation_fee_min ?? ""),
      consultation_fee_max: String((doctor as { consultation_fee_max?: number }).consultation_fee_max ?? ""),
      intro_video_url: (doctor as { intro_video_url?: string }).intro_video_url ?? "",
    });
  }, [doctor]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!doctor) throw new Error("no doctor");
      const toArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      return update({
        data: {
          doctor_id: doctor.id,
          academic_title: form.academic_title || null,
          medical_title: form.medical_title || null,
          bio_ar: form.bio_ar || null,
          bio_en: form.bio_en || null,
          sub_specialties: toArr(form.sub_specialties),
          languages: toArr(form.languages),
          consultation_fee_min: form.consultation_fee_min ? Number(form.consultation_fee_min) : null,
          consultation_fee_max: form.consultation_fee_max ? Number(form.consultation_fee_max) : null,
          intro_video_url: form.intro_video_url || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      qc.invalidateQueries({ queryKey: ["my-doctor-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="container mx-auto p-6" dir="rtl">جاري التحميل...</div>;
  if (!doctor) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <p>لا يوجد ملف طبيب. <Link to="/doctor/join" className="underline">تقديم طلب</Link></p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl" dir="rtl">
      <Card>
        <CardHeader><CardTitle>الملف الشخصي</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>اللقب الأكاديمي</Label>
              <Input value={form.academic_title} onChange={(e) => setForm({ ...form, academic_title: e.target.value })} /></div>
            <div><Label>اللقب الطبي</Label>
              <Input value={form.medical_title} onChange={(e) => setForm({ ...form, medical_title: e.target.value })} /></div>
          </div>
          <div><Label>التخصصات الفرعية (مفصولة بفواصل)</Label>
            <Input value={form.sub_specialties} onChange={(e) => setForm({ ...form, sub_specialties: e.target.value })} /></div>
          <div><Label>اللغات (مفصولة بفواصل: ar, en)</Label>
            <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>أدنى سعر كشف (ريال)</Label>
              <Input type="number" value={form.consultation_fee_min} onChange={(e) => setForm({ ...form, consultation_fee_min: e.target.value })} /></div>
            <div><Label>أعلى سعر كشف (ريال)</Label>
              <Input type="number" value={form.consultation_fee_max} onChange={(e) => setForm({ ...form, consultation_fee_max: e.target.value })} /></div>
          </div>
          <div><Label>رابط فيديو تعريفي</Label>
            <Input value={form.intro_video_url} onChange={(e) => setForm({ ...form, intro_video_url: e.target.value })} /></div>
          <div><Label>نبذة (عربي)</Label>
            <Textarea rows={4} value={form.bio_ar} onChange={(e) => setForm({ ...form, bio_ar: e.target.value })} /></div>
          <div><Label>نبذة (إنجليزي)</Label>
            <Textarea rows={4} value={form.bio_en} onChange={(e) => setForm({ ...form, bio_en: e.target.value })} /></div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
