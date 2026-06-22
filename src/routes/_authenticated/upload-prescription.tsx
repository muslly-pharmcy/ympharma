import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  submitPrescriptionForReview,
  getMyPrescriptionRequest,
} from "@/lib/prescription-intelligence.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, XCircle, Clock, FileImage, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upload-prescription")({
  head: () => ({
    meta: [
      { title: "رفع وصفة طبية — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "ارفع صورة وصفتك الطبية ليتم تحليلها ومراجعتها من صيدلي." },
    ],
  }),
  component: UploadPrescriptionPage,
});

const STATUS_META: Record<
  string,
  { label: string; cls: string; icon: typeof Clock }
> = {
  pending: { label: "قيد المراجعة", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: Clock },
  approved: { label: "تمت الموافقة", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "مرفوضة", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  expired: { label: "منتهية", cls: "bg-muted text-muted-foreground border-muted", icon: XCircle },
};

function UploadPrescriptionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const qc = useQueryClient();
  const submitFn = useServerFn(submitPrescriptionForReview);
  const statusFn = useServerFn(getMyPrescriptionRequest);

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("اختر صورة الوصفة أولاً");
      if (file.size > 5 * 1024 * 1024) throw new Error("الحجم الأقصى 5 ميجابايت");
      if (!file.type.startsWith("image/")) throw new Error("الملف يجب أن يكون صورة");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("prescriptions")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const res = await submitFn({ data: { storagePath: path, customerNote: note || undefined } });
      return res;
    },
    onSuccess: (res) => {
      setApprovalId(res.approvalId);
      toast.success("تم استلام وصفتك — جارٍ المراجعة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Initial fetch (one-shot) — Realtime handles subsequent updates.
  const status = useQuery({
    queryKey: ["my-prescription-request", approvalId],
    queryFn: () => statusFn({ data: { id: approvalId! } }),
    enabled: !!approvalId,
  });

  // Realtime subscription on the user's specific approval row.
  useEffect(() => {
    if (!approvalId) return;
    setLiveConnected(false);
    const channel = supabase
      .channel(`approval:${approvalId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_approval_requests",
          filter: `id=eq.${approvalId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["my-prescription-request", approvalId] });
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setLiveConnected(true);
      });
    return () => {
      supabase.removeChannel(channel);
      setLiveConnected(false);
    };
  }, [approvalId, qc]);

  const req = status.data?.request;
  const analysis = (req?.payload as { analysis?: { medicines?: Array<{ name: string; inStock: boolean; stockQty: number; priceYer: number | null }>; missingMedicines?: string[]; notes?: string } } | undefined)?.analysis;
  const meta = req ? STATUS_META[req.status] : null;
  const StatusIcon = meta?.icon ?? Clock;

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-6 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileImage className="h-6 w-6" /> رفع وصفة طبية
      </h1>

      {!approvalId && (
        <Card className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            ارفع صورة واضحة لوصفتك الطبية. سنحللها تلقائياً ثم يراجعها صيدلي قبل التنفيذ.
          </p>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">صورة الوصفة</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-4 file:py-2"
            />
            {file && (
              <p className="mt-2 text-xs text-muted-foreground">
                {file.name} — {(file.size / 1024).toFixed(0)} ك.ب
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium mb-1 block">ملاحظات (اختياري)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي تعليمات إضافية للصيدلي..."
              rows={3}
              maxLength={500}
            />
          </label>

          <Button
            onClick={() => submit.mutate()}
            disabled={!file || submit.isPending}
            className="w-full"
          >
            {submit.isPending ? (
              <><Loader2 className="h-4 w-4 me-2 animate-spin" /> جارٍ الرفع والتحليل…</>
            ) : (
              <><Upload className="h-4 w-4 me-2" /> رفع وإرسال للمراجعة</>
            )}
          </Button>
        </Card>
      )}

      {approvalId && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">رقم الطلب</p>
              <p className="font-mono text-sm">{approvalId.slice(0, 8).toUpperCase()}</p>
            </div>
            {meta && (
              <Badge variant="outline" className={meta.cls}>
                <StatusIcon className="h-3 w-3 me-1" />
                {meta.label}
              </Badge>
            )}
          </div>

          {req?.decision_note && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">ملاحظة الصيدلي:</p>
              <p>{req.decision_note}</p>
            </div>
          )}

          {analysis && analysis.medicines && analysis.medicines.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-sm">الأدوية المستخرجة</h2>
              <ul className="divide-y rounded-md border">
                {analysis.medicines.map((m, i) => (
                  <li key={i} className="p-3 flex items-center justify-between gap-2 text-sm">
                    <span>{m.name}</span>
                    {m.inStock ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                        🟢 متوفر ({m.stockQty})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                        🔴 غير متوفر
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              {analysis.missingMedicines && analysis.missingMedicines.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {analysis.missingMedicines.length} دواء غير متوفر حالياً — سيتم التواصل معك.
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setApprovalId(null);
              setFile(null);
              setNote("");
            }}
          >
            رفع وصفة أخرى
          </Button>
        </Card>
      )}
    </div>
  );
}
