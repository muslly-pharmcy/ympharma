// Phase 7 — Reviewer edit/approve page for AI prescription extractions
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  getExtractionForReview,
  saveExtractionEdits,
  approveExtractionEdits,
} from "@/lib/prescription-extraction-review.functions";

type SearchParams = { prescriptionId?: string };

export const Route = createFileRoute("/admin-rx-extraction-edit")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    prescriptionId: typeof s.prescriptionId === "string" ? s.prescriptionId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "اعتماد استخراج روشتة AI — صيدلية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Med = { name: string; dose?: string | null; duration?: string | null };

function Page() {
  const { prescriptionId } = Route.useSearch();
  const loadFn = useServerFn(getExtractionForReview);
  const saveFn = useServerFn(saveExtractionEdits);
  const approveFn = useServerFn(approveExtractionEdits);

  const [loading, setLoading] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [meds, setMeds] = useState<Med[]>([]);
  const [doctor, setDoctor] = useState("");
  const [pdate, setPdate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");
  const [interactions, setInteractions] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!prescriptionId) return;
    setLoading(true);
    try {
      const res = await loadFn({ data: { prescriptionId } });
      const x = res.extraction;
      setExtraction(x);
      if (x) {
        const edits = (x.reviewer_edits ?? {}) as any;
        setMeds((edits.medications ?? x.medications ?? []) as Med[]);
        setDoctor(edits.doctor_name ?? x.doctor_name ?? "");
        setPdate(edits.prescription_date ?? x.prescription_date ?? "");
        setDiagnosis(edits.diagnosis ?? x.diagnosis ?? "");
        setAllergies((edits.allergies ?? x.allergies ?? []).join(", "));
        setInteractions((edits.interactions ?? x.interactions ?? []).join(", "));
        setNotes(edits.notes ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحميل");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [prescriptionId]);

  const diff = useMemo(() => {
    if (!extraction) return [] as string[];
    const out: string[] = [];
    const origMeds = (extraction.medications ?? []) as Med[];
    if (JSON.stringify(origMeds) !== JSON.stringify(meds)) {
      out.push(`الأدوية (${origMeds.length} → ${meds.length})`);
    }
    if ((extraction.doctor_name ?? "") !== doctor) out.push("اسم الطبيب");
    if ((extraction.prescription_date ?? "") !== pdate) out.push("التاريخ");
    if ((extraction.diagnosis ?? "") !== diagnosis) out.push("التشخيص");
    const origAll = (extraction.allergies ?? []).join(", ");
    if (origAll !== allergies) out.push("الحساسيات");
    const origInt = (extraction.interactions ?? []).join(", ");
    if (origInt !== interactions) out.push("التفاعلات");
    return out;
  }, [extraction, meds, doctor, pdate, diagnosis, allergies, interactions]);

  const buildEdits = () => ({
    medications: meds.filter((m) => m.name.trim()),
    doctor_name: doctor || null,
    prescription_date: pdate || null,
    diagnosis: diagnosis || null,
    allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
    interactions: interactions.split(",").map((s) => s.trim()).filter(Boolean),
    notes: notes || null,
  });

  const onSave = async () => {
    if (!extraction) return;
    setBusy(true);
    try {
      await saveFn({ data: { extractionId: extraction.id, edits: buildEdits() } });
      toast.success("حُفظت التعديلات");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الحفظ"); }
    finally { setBusy(false); }
  };

  const onApprove = async () => {
    if (!extraction) return;
    setBusy(true);
    try {
      if (diff.length) {
        await saveFn({ data: { extractionId: extraction.id, edits: buildEdits() } });
      }
      await approveFn({ data: { extractionId: extraction.id } });
      toast.success("تم الاعتماد");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الاعتماد"); }
    finally { setBusy(false); }
  };

  if (!prescriptionId) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground" dir="rtl">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm">
          مرّر <code>?prescriptionId=...</code> لفتح ملف استخراج.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/admin-rx-review"
            search={{ tab: "IN_REVIEW", q: "", page: 1, rx: prescriptionId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-4" /> مراجعة الروشتة
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{prescriptionId}</span>
        </div>

        {loading || !extraction ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm">
            {loading ? "جارٍ التحميل…" : "لا يوجد استخراج لهذه الروشتة."}
          </p>
        ) : (
          <>
            <header className="mb-3 rounded-2xl border border-border bg-card p-4 text-xs">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                  {extraction.source_type === "insurance" ? "تأمين" : "روشتة"}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5">حالة: {extraction.status}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">tier: {extraction.model_tier}</span>
                {extraction.confidence != null && (
                  <span className={`rounded-full px-2 py-0.5 font-bold ${
                    Number(extraction.confidence) >= 80
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    ثقة AI: {extraction.confidence}%
                  </span>
                )}
                {extraction.reviewer_approved_at && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                    اعتُمد {new Date(extraction.reviewer_approved_at).toLocaleString("ar")}
                  </span>
                )}
                {diff.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                    تغييرات غير محفوظة: {diff.join(" · ")}
                  </span>
                )}
              </div>
            </header>

            <section className="mb-3 rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-black">الأدوية</h2>
                <button
                  onClick={() => setMeds((m) => [...m, { name: "", dose: "", duration: "" }])}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[11px] font-black text-primary-foreground"
                >
                  <Plus className="size-3" /> إضافة دواء
                </button>
              </div>
              <ul className="space-y-2">
                {meds.map((m, i) => (
                  <li key={i} className="grid grid-cols-[1fr_120px_120px_auto] gap-2">
                    <input value={m.name} onChange={(e) => setMeds(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="الاسم" className="rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                    <input value={m.dose ?? ""} onChange={(e) => setMeds(prev => prev.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))}
                      placeholder="الجرعة" className="rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                    <input value={m.duration ?? ""} onChange={(e) => setMeds(prev => prev.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))}
                      placeholder="المدة" className="rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                    <button onClick={() => setMeds(prev => prev.filter((_, j) => j !== i))}
                      className="rounded-lg bg-rose-100 p-1 text-rose-700"><Trash2 className="size-3" /></button>
                  </li>
                ))}
                {meds.length === 0 && <li className="text-xs text-muted-foreground">لا توجد أدوية مستخرجة.</li>}
              </ul>
            </section>

            <section className="mb-3 grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
              <label className="text-xs">
                <div className="mb-1 font-bold">اسم الطبيب</div>
                <input value={doctor} onChange={(e) => setDoctor(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
              <label className="text-xs">
                <div className="mb-1 font-bold">التاريخ</div>
                <input value={pdate} onChange={(e) => setPdate(e.target.value)} placeholder="YYYY-MM-DD"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
              <label className="text-xs sm:col-span-2">
                <div className="mb-1 font-bold">التشخيص</div>
                <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
              <label className="text-xs sm:col-span-2">
                <div className="mb-1 font-bold">الحساسيات (مفصولة بفاصلة)</div>
                <input value={allergies} onChange={(e) => setAllergies(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
              <label className="text-xs sm:col-span-2">
                <div className="mb-1 font-bold">التفاعلات (مفصولة بفاصلة)</div>
                <input value={interactions} onChange={(e) => setInteractions(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
              <label className="text-xs sm:col-span-2">
                <div className="mb-1 font-bold">ملاحظات المراجع</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1" />
              </label>
            </section>

            <div className="flex gap-2">
              <button onClick={onSave} disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
                {busy ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} حفظ التعديلات
              </button>
              <button onClick={onApprove} disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                {diff.length ? "حفظ واعتماد" : "اعتماد الاستخراج"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
