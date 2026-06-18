import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Shield, RefreshCw, ExternalLink, Send } from "lucide-react";
import { testUptimeWebhook } from "@/lib/incident-alerts.functions";
import { toast } from "sonner";

type Claim = {
  id: string;
  insurance_company: string;
  insurance_number: string;
  patient_name: string;
  patient_phone: string;
  card_image_url: string | null;
  card_expiry: string | null;
  prescription_image_url: string | null;
  prescription_date: string | null;
  diagnosis: string | null;
  is_stamped: boolean;
  status: string;
  validation_notes: string | null;
  channel: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
  needs_info: "ينقصه معلومات",
  fulfilled: "تم التنفيذ",
};

export function InsuranceTab() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const test = useServerFn(testUptimeWebhook);

  async function load() {
    setBusy(true);
    let q = supabase.from("insurance_claims").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data ?? []) as Claim[]);
    setBusy(false);
  }
  useEffect(() => { void load(); }, [filter]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("insurance_claims").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم تحديث الحالة"); void load(); }
  }

  async function openSigned(path: string) {
    const { data, error } = await supabase.storage.from("insurance").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) { toast.error("تعذّر فتح الصورة"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function runWebhookTest(event: "down" | "up") {
    try {
      const res = await test({ data: { event, severity: "minor" } });
      if (res.ok) toast.success(`نجح الاختبار — استجابة ${res.status}`);
      else toast.error(`فشل — ${res.error || res.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاختبار");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Shield className="size-5 text-primary" /> طلبات التأمين الطبي
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold">
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={load} disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button onClick={() => runWebhookTest("down")}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-600">
            <Send className="size-3.5" /> اختبار webhook (down)
          </button>
          <button onClick={() => runWebhookTest("up")}
            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600">
            <Send className="size-3.5" /> اختبار webhook (up)
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          لا توجد طلبات تأمين.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const expired = r.card_expiry && new Date(r.card_expiry) < new Date();
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">{r.insurance_company}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold">{r.channel}</span>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-black ${
                    r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    r.status === "rejected" ? "bg-rose-100 text-rose-700" :
                    r.status === "needs_info" ? "bg-amber-100 text-amber-700" :
                    r.status === "fulfilled" ? "bg-sky-100 text-sky-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                  {expired && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">بطاقة منتهية</span>}
                  {!r.is_stamped && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">غير مختومة</span>}
                  <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                </div>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  <p><strong>المريض:</strong> {r.patient_name} <span dir="ltr" className="text-muted-foreground">— {r.patient_phone}</span></p>
                  <p><strong>رقم التأمين:</strong> <span dir="ltr">{r.insurance_number}</span></p>
                  <p><strong>انتهاء البطاقة:</strong> {r.card_expiry ?? "—"}</p>
                  <p><strong>تاريخ الوصفة:</strong> {r.prescription_date ?? "—"}</p>
                  <p className="sm:col-span-2"><strong>التشخيص:</strong> {r.diagnosis ?? "—"}</p>
                </div>
                {r.validation_notes && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[12px] text-amber-900">ملاحظات تحقق: {r.validation_notes}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.card_image_url && <a href={r.card_image_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold hover:bg-accent"><ExternalLink className="size-3" /> صورة البطاقة</a>}
                  {r.prescription_image_url && <a href={r.prescription_image_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold hover:bg-accent"><ExternalLink className="size-3" /> صورة الوصفة</a>}
                  <span className="mx-1 text-muted-foreground">|</span>
                  {(["approved","rejected","needs_info","fulfilled"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(r.id, s)}
                      className="rounded-md bg-secondary px-2 py-1 text-[11px] font-bold hover:bg-primary hover:text-primary-foreground">
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
