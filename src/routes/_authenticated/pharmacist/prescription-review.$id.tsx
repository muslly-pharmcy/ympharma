// Phoenix Prescription Intelligence — pharmacist review detail
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getPrescriptionReviewDetail,
  getPrescriptionFileSignedUrl,
  savePrescriptionMatchedProducts,
  assignPrescriptionReview,
  startPrescriptionReview,
  approvePrescription,
  rejectPrescription,
  escalatePrescription,
} from "@/lib/prescription-review.functions";
import { searchMedicinesIntelligent } from "@/modules/product-intelligence/functions/intelligence.functions";

export const Route = createFileRoute("/_authenticated/pharmacist/prescription-review/$id")({
  head: () => ({ meta: [{ title: "مراجعة وصفة | Muslly" }] }),
  component: ReviewPage,
});

type Match = { line: string; productId: string | null; productLabel?: string; note?: string };

function ReviewPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const detailFn = useServerFn(getPrescriptionReviewDetail);
  const signFn = useServerFn(getPrescriptionFileSignedUrl);
  const saveFn = useServerFn(savePrescriptionMatchedProducts);
  const assignFn = useServerFn(assignPrescriptionReview);
  const startFn = useServerFn(startPrescriptionReview);
  const approveFn = useServerFn(approvePrescription);
  const rejectFn = useServerFn(rejectPrescription);
  const escalateFn = useServerFn(escalatePrescription);
  const searchFn = useServerFn(searchMedicinesIntelligent);

  const { data, isLoading } = useQuery({
    queryKey: ["rx-review", id],
    queryFn: () => detailFn({ data: { prescriptionId: id } }),
  });

  const [notes, setNotes] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);

  const { data: hits = [] } = useQuery({
    queryKey: ["rx-search", searchQ],
    queryFn: () => searchFn({ data: { q: searchQ, limit: 10 } }),
    enabled: searchQ.trim().length >= 2,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rx-review", id] });

  const doAction = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); toast.success(label); invalidate(); }
    catch (e) { toast.error(e instanceof Error ? e.message : label + " failed"); }
  };

  const openFile = async (fileId: string) => {
    try {
      const { url } = await signFn({ data: { fileId, ttlSeconds: 600 } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "sign_failed");
    }
  };

  if (isLoading || !data) return <div className="p-6 text-sm" dir="rtl">جاري التحميل…</div>;

  const extractionMeds = (data.extraction?.medications as Array<{ name?: string; dosage?: string }> | null) ?? [];
  const medLines = extractionMeds.length > 0 ? extractionMeds : [];

  const addMatch = (idx: number, line: string, hit: { id: string; name_ar: string; name_en: string | null }) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.line !== line);
      next.push({ line, productId: hit.id, productLabel: hit.name_ar || hit.name_en || "" });
      return next;
    });
    setActiveLineIdx(null);
    setSearchQ("");
    toast.success(`تم ربط: ${hit.name_ar}`);
    void idx;
  };

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4" dir="rtl">
      {/* Non-dismissible verification banner */}
      <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-sm font-bold text-amber-900">
        ⚠️ Requires pharmacist verification — كل بيانات الذكاء الاصطناعي أدناه بحاجة لتأكيد الصيدلي قبل الاعتماد.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-muted-foreground">{data.correlation_ref}</div>
          <h1 className="text-xl font-bold">{data.prescription?.customer_name ?? "وصفة"}</h1>
          <div className="text-xs text-muted-foreground">{data.prescription?.customer_phone}</div>
        </div>
        <Badge variant="secondary">{data.review.status}</Badge>
      </div>

      {/* Files */}
      <section className="rounded-lg border p-3 space-y-2">
        <h2 className="font-semibold text-sm">صور الوصفة ({data.files.length})</h2>
        <div className="flex flex-wrap gap-2">
          {data.files.map((f) => (
            <Button key={f.id} variant="outline" size="sm" onClick={() => openFile(f.id)}>
              فتح — {f.mime_type ?? "file"}
            </Button>
          ))}
          {data.files.length === 0 && <p className="text-xs text-muted-foreground">لا صور مرفقة.</p>}
        </div>
      </section>

      {/* AI extraction */}
      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">استخراج الذكاء الاصطناعي</h2>
          {data.extraction && (
            <span className="text-xs text-muted-foreground">
              {data.extraction.model_used ?? data.extraction.model_tier} — ثقة {Math.round((data.extraction.confidence ?? 0) * 100)}%
            </span>
          )}
        </div>
        {!data.extraction && <p className="text-xs text-muted-foreground">لم يُشغَّل الاستخراج بعد.</p>}
        {medLines.length > 0 && (
          <ul className="space-y-2">
            {medLines.map((m, i) => {
              const line = `${m.name ?? ""} ${m.dosage ?? ""}`.trim() || `Line ${i + 1}`;
              const matched = matches.find((x) => x.line === line);
              return (
                <li key={i} className="rounded border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">{m.name ?? "?"}</span>
                      {m.dosage ? <span className="text-muted-foreground"> — {m.dosage}</span> : null}
                    </div>
                    {matched ? (
                      <Badge>{matched.productLabel}</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setActiveLineIdx(i); setSearchQ(m.name ?? ""); }}>
                        اختر منتج
                      </Button>
                    )}
                  </div>
                  {activeLineIdx === i && (
                    <div className="mt-2 space-y-1">
                      <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="بحث في الكتالوج…" />
                      <ul className="max-h-48 overflow-auto rounded border bg-background">
                        {hits.map((h) => (
                          <li key={h.id}>
                            <button
                              type="button"
                              onClick={() => addMatch(i, line, h)}
                              className="block w-full text-right px-2 py-1 text-sm hover:bg-accent"
                            >
                              {h.name_ar} <span className="text-xs text-muted-foreground">{h.strength ?? ""}</span>
                            </button>
                          </li>
                        ))}
                        {hits.length === 0 && searchQ.trim().length >= 2 && (
                          <li className="p-2 text-xs text-muted-foreground">لا نتائج.</li>
                        )}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {matches.length > 0 && (
          <Button
            size="sm"
            onClick={() => doAction("حُفظ الربط", () => saveFn({ data: { prescriptionId: id, matches } }))}
          >
            حفظ الربط ({matches.length})
          </Button>
        )}
      </section>

      {/* Actions */}
      <section className="rounded-lg border p-3 space-y-2">
        <h2 className="font-semibold text-sm">إجراءات المراجعة</h2>
        <Textarea placeholder="ملاحظات / سبب" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline"
            onClick={() => doAction("تم الإسناد", () => assignFn({ data: { prescriptionId: id } }))}>
            أسندها لي
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => doAction("بدء المراجعة", () => startFn({ data: { prescriptionId: id } }))}>
            ابدأ المراجعة
          </Button>
          <Button size="sm"
            onClick={() => doAction("اعتُمدت", () => approveFn({ data: { prescriptionId: id, notes: notes || undefined } }))}>
            اعتماد
          </Button>
          <Button size="sm" variant="destructive"
            onClick={() => {
              if (!notes.trim()) return toast.error("اكتب سبب الرفض");
              return doAction("رُفضت", () => rejectFn({ data: { prescriptionId: id, reason: notes } }));
            }}>
            رفض
          </Button>
          <Button size="sm" variant="secondary"
            onClick={() => {
              if (!notes.trim()) return toast.error("اكتب سبب التصعيد");
              return doAction("صُعّدت", () => escalateFn({ data: { prescriptionId: id, reason: notes } }));
            }}>
            تصعيد
          </Button>
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-lg border p-3 space-y-1">
        <h2 className="font-semibold text-sm">المسار الزمني</h2>
        <ol className="space-y-1 text-xs">
          {data.timeline.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground w-40 shrink-0">{new Date(t.at).toLocaleString("ar")}</span>
              <span className="font-mono">{t.kind}</span>
              <span>{t.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <Link to="/pharmacist/prescription-queue" className="text-xs underline">← عودة للطابور</Link>
    </div>
  );
}
