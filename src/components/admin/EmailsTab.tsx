import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendAdminEmail, listEmailLogs } from "@/lib/email-alerts.functions";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent: { label: "تم الإرسال", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "قيد الإرسال", color: "bg-amber-100 text-amber-700 border-amber-200" },
  failed: { label: "فشل", color: "bg-rose-100 text-rose-700 border-rose-200" },
  dlq: { label: "متروك", color: "bg-rose-100 text-rose-700 border-rose-200" },
  suppressed: { label: "محظور", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  bounced: { label: "مرتد", color: "bg-rose-100 text-rose-700 border-rose-200" },
  complained: { label: "شكوى", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export function EmailsTab() {
  const send = useServerFn(sendAdminEmail);
  const list = useServerFn(listEmailLogs);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("alimohmed.321@gmail.com");

  const refresh = async () => {
    try { const r = await list({}); setLogs(r.logs ?? []); } catch (e: any) { toast.error(e.message); }
  };

  useEffect(() => { refresh(); }, []);

  const sendTest = async () => {
    setBusy(true);
    try {
      const recipients = testTo.split(",").map(s => s.trim()).filter(Boolean);
      const res = await send({ data: { templateName: "test-email", templateData: { sentAt: new Date().toLocaleString("ar") }, recipients } });
      const accepted = res.results.filter(r => r.status === "accepted").length;
      const rejected = res.results.length - accepted;
      toast.success(`تم القبول: ${accepted} — الرفض: ${rejected}`);
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-lg font-black">حالة نطاق الإرسال</h3>
        <div className="text-sm space-y-1">
          <div>النطاق: <span className="font-mono">notify.muslly.com</span></div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-bold">SPF ✓</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-bold">DKIM ✓</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-bold">DMARC ✓</span>
          </div>
          <p className="text-xs text-muted-foreground">الإعداد التلقائي عبر تفويض NS لـ Lovable. اسم المُرسل: <b>ympharma</b> &lt;no-reply@muslly.com&gt;. حد التكرار لتنبيهات الحوادث: 60 دقيقة.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-lg font-black">إرسال بريد اختبار الآن</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="عناوين مفصولة بفواصل" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={sendTest} disabled={busy} className="brand-gradient rounded-lg px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
            {busy ? "جارٍ الإرسال…" : "إرسال اختبار"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black">سجل آخر 50 رسالة</h3>
          <button onClick={refresh} className="text-xs font-bold text-primary hover:underline">تحديث</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-right p-2">القالب</th><th className="text-right p-2">المستلم</th><th className="text-right p-2">الحالة</th><th className="text-right p-2">السبب</th><th className="text-right p-2">الوقت</th></tr>
            </thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-6">لا توجد رسائل بعد.</td></tr>}
              {logs.map(l => {
                const s = STATUS_LABELS[l.status] ?? { label: l.status, color: "bg-zinc-100 text-zinc-700 border-zinc-200" };
                return (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="p-2 font-mono text-xs">{l.template_name}</td>
                    <td className="p-2">{l.recipient_email}</td>
                    <td className="p-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${s.color}`}>{s.label}</span></td>
                    <td className="p-2 text-xs text-muted-foreground max-w-xs truncate" title={l.error_message ?? ""}>{l.error_message ?? "—"}</td>
                    <td className="p-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("ar")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
