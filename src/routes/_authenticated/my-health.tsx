import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateMyPatient,
  listMyMedications,
  addMyMedication,
  stopMyMedication,
  getMyTimeline,
  listMyVaultFiles,
  registerVaultFile,
  getVaultDownloadUrl,
} from "@/modules/patient-os/patient.functions";
import { GlassCard } from "@/components/futuristic/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/my-health")({
  head: () => ({
    meta: [
      { title: "ملفي الصحي — MUSLLY" },
      { name: "description", content: "الجدول الزمني الصحي، الأدوية، والخزنة الطبية." },
    ],
  }),
  component: MyHealth,
});

type Patient = { id: string; full_name: string };
type Med = {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  source: string;
  notes: string | null;
};
type Event = {
  id: string;
  event_type: string;
  event_date: string;
  summary: string;
  payload: Record<string, unknown>;
};
type VaultFile = {
  id: string;
  file_type: string;
  title: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function MyHealth() {
  const getPatient = useServerFn(getOrCreateMyPatient);
  const fetchMeds = useServerFn(listMyMedications);
  const addMed = useServerFn(addMyMedication);
  const stopMed = useServerFn(stopMyMedication);
  const fetchTimeline = useServerFn(getMyTimeline);
  const fetchVault = useServerFn(listMyVaultFiles);
  const registerFile = useServerFn(registerVaultFile);
  const signUrl = useServerFn(getVaultDownloadUrl);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Med[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (pid: string) => {
    const [m, t, v] = await Promise.all([
      fetchMeds({ data: { patientId: pid } }),
      fetchTimeline({ data: { patientId: pid } }),
      fetchVault({ data: { patientId: pid } }),
    ]);
    setMeds(m as Med[]);
    setEvents(t as Event[]);
    setFiles(v as VaultFile[]);
  }, [fetchMeds, fetchTimeline, fetchVault]);

  useEffect(() => {
    (async () => {
      try {
        const p = (await getPatient({})) as Patient;
        setPatient(p);
        await refresh(p.id);
      } catch (e) {
        toast.error("تعذر تحميل الملف الصحي");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [getPatient, refresh]);

  if (loading) return <div className="p-8 text-center">جاري تحميل ملفك الصحي…</div>;
  if (!patient) return <div className="p-8 text-center">تعذر إنشاء الملف الصحي.</div>;

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">ملفي الصحي</h1>
        <p className="text-muted-foreground">
          مرحبًا {patient.full_name} — إدارة الأدوية، الخط الزمني، والخزنة الطبية.
        </p>
      </header>

      <Tabs defaultValue="timeline" dir="rtl">
        <TabsList>
          <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
          <TabsTrigger value="medications">الأدوية</TabsTrigger>
          <TabsTrigger value="vault">الخزنة الطبية</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-3 mt-4">
          {events.length === 0 && (
            <GlassCard><p className="text-muted-foreground text-center">لا توجد أحداث بعد.</p></GlassCard>
          )}
          {events.map((e) => (
            <GlassCard key={e.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{e.summary}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(e.event_date).toLocaleString("ar-EG")}</div>
              </div>
              <Badge variant="secondary">{e.event_type}</Badge>
            </GlassCard>
          ))}
        </TabsContent>

        <TabsContent value="medications" className="space-y-4 mt-4">
          <AddMedicationForm
            onAdd={async (input) => {
              await addMed({ data: { patientId: patient.id, ...input } });
              await refresh(patient.id);
              toast.success("تمت إضافة الدواء");
            }}
          />
          <div className="space-y-3">
            {meds.map((m) => (
              <GlassCard key={m.id} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold">{m.medicine_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[m.dosage, m.frequency, m.route].filter(Boolean).join(" · ") || "بدون تفاصيل"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    منذ {m.start_date}{m.end_date ? ` — حتى ${m.end_date}` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "نشط" : "متوقف"}
                  </Badge>
                  {m.active && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await stopMed({ data: { medicationId: m.id } });
                      await refresh(patient.id);
                      toast.success("تم إيقاف الدواء");
                    }}>إيقاف</Button>
                  )}
                </div>
              </GlassCard>
            ))}
            {meds.length === 0 && <p className="text-center text-muted-foreground">لا توجد أدوية مسجلة.</p>}
          </div>
        </TabsContent>

        <TabsContent value="vault" className="space-y-4 mt-4">
          <VaultUploader
            patientId={patient.id}
            onUploaded={async ({ path, title, fileType, mime, size }) => {
              await registerFile({
                data: {
                  patientId: patient.id,
                  storagePath: path,
                  title,
                  fileType,
                  mimeType: mime,
                  sizeBytes: size,
                },
              });
              await refresh(patient.id);
              toast.success("تم رفع الملف بأمان");
            }}
          />
          <div className="space-y-3">
            {files.map((f) => (
              <GlassCard key={f.id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{f.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.file_type} · {new Date(f.created_at).toLocaleDateString("ar-EG")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const { url } = (await signUrl({ data: { fileId: f.id } })) as { url: string };
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  عرض
                </Button>
              </GlassCard>
            ))}
            {files.length === 0 && <p className="text-center text-muted-foreground">الخزنة فارغة.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddMedicationForm({
  onAdd,
}: {
  onAdd: (input: { medicineName: string; dosage?: string; frequency?: string; route?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <GlassCard className="space-y-3">
      <div className="font-semibold">إضافة دواء</div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="mn">اسم الدواء</Label>
          <Input id="mn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Panadol" />
        </div>
        <div>
          <Label htmlFor="md">الجرعة</Label>
          <Input id="md" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="500mg" />
        </div>
        <div>
          <Label htmlFor="mf">التكرار</Label>
          <Input id="mf" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="كل 8 ساعات" />
        </div>
      </div>
      <Button
        disabled={!name || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd({ medicineName: name, dosage: dosage || undefined, frequency: frequency || undefined });
            setName(""); setDosage(""); setFrequency("");
          } finally {
            setBusy(false);
          }
        }}
      >
        إضافة
      </Button>
    </GlassCard>
  );
}

function VaultUploader({
  patientId,
  onUploaded,
}: {
  patientId: string;
  onUploaded: (args: { path: string; title: string; fileType: "prescription"|"scan"|"report"|"image"|"lab_result"|"certificate"|"other"; mime: string | null; size: number }) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<string>("report");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <GlassCard className="space-y-3">
      <div className="font-semibold">رفع ملف إلى الخزنة</div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="vt">العنوان</Label>
          <Input id="vt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="تحليل دم" />
        </div>
        <div>
          <Label>النوع</Label>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="report">تقرير</SelectItem>
              <SelectItem value="lab_result">نتيجة مختبر</SelectItem>
              <SelectItem value="scan">أشعة</SelectItem>
              <SelectItem value="prescription">وصفة</SelectItem>
              <SelectItem value="image">صورة</SelectItem>
              <SelectItem value="certificate">شهادة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="vf">الملف</Label>
          <Input id="vf" ref={inputRef} type="file" accept="image/*,application/pdf" />
        </div>
      </div>
      <Button
        disabled={busy || !title}
        onClick={async () => {
          const file = inputRef.current?.files?.[0];
          if (!file) { toast.error("اختر ملفًا"); return; }
          setBusy(true);
          try {
            const { data: userData } = await supabase.auth.getUser();
            const uid = userData.user?.id;
            if (!uid) throw new Error("no session");
            const ext = file.name.split(".").pop() || "bin";
            const path = `${uid}/${patientId}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("medical-vault")
              .upload(path, file, { contentType: file.type || undefined });
            if (upErr) throw upErr;
            await onUploaded({
              path,
              title,
              fileType: fileType as "report",
              mime: file.type || null,
              size: file.size,
            });
            setTitle("");
            if (inputRef.current) inputRef.current.value = "";
          } catch (e) {
            console.error(e);
            toast.error("فشل رفع الملف");
          } finally {
            setBusy(false);
          }
        }}
      >
        رفع
      </Button>
    </GlassCard>
  );
}
