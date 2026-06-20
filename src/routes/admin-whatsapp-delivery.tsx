// Phase 6C — WhatsApp Delivery KPI dashboard.
// Read-only view: counts by status over the last N hours + recent failures.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, RefreshCcw, Send, CheckCheck, Eye, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin-whatsapp-delivery")({
  head: () => ({ meta: [{ title: "تسليم رسائل واتساب — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Row = {
  id: string;
  message_kind: string;
  recipient_phone: string;
  status: string;
  attempts: number | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(24);

  const load = async () => {
    setBusy(true);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data } = await supabase
      .from("whatsapp_delivery_logs")
      .select("id,message_kind,recipient_phone,status,attempts,error_message,sent_at,delivered_at,read_at,failed_at,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as Row[]);
    setBusy(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter(r => r.sent_at).length;
    const delivered = rows.filter(r => r.delivered_at).length;
    const read = rows.filter(r => r.read_at).length;
    const failed = rows.filter(r => r.status === "failed" || r.status === "dead_letter" || r.failed_at).length;
    const deliveryRate = sent ? Math.round((delivered / sent) * 100) : 0;
    const readRate = delivered ? Math.round((read / delivered) * 100) : 0;
    return { total, sent, delivered, read, failed, deliveryRate, readRate };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" /> الإدارة
          </Link>
          <div className="flex items-center gap-2">
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs">
              <option value={1}>آخر ساعة</option>
              <option value={24}>آخر 24 ساعة</option>
              <option value={168}>آخر 7 أيام</option>
            </select>
            <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />} تحديث
            </button>
          </div>
        </div>

        <h1 className="mb-4 text-xl font-black">تسليم رسائل واتساب — Phase 6C</h1>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="إجمالي" value={stats.total} />
          <Stat label="أُرسلت" value={stats.sent} icon={<Send className="size-3" />} />
          <Stat label={`تسليم ${stats.deliveryRate}%`} value={stats.delivered} icon={<CheckCheck className="size-3 text-emerald-600" />} />
          <Stat label={`قراءة ${stats.readRate}%`} value={stats.read} icon={<Eye className="size-3 text-blue-600" />} />
          <Stat label="فشل" value={stats.failed} icon={<AlertTriangle className="size-3 text-rose-600" />} danger={stats.failed > 0} />
        </div>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50 text-right text-[11px]">
              <tr>
                <th className="p-2">الوقت</th>
                <th className="p-2">النوع</th>
                <th className="p-2">المستلم</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">محاولات</th>
                <th className="p-2">الخطأ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/50 align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
                  <td className="p-2 font-bold">{r.message_kind}</td>
                  <td className="p-2 font-mono">{r.recipient_phone}</td>
                  <td className="p-2"><StatusBadge s={r.status} delivered={!!r.delivered_at} read={!!r.read_at} /></td>
                  <td className="p-2 text-center">{r.attempts ?? 1}</td>
                  <td className="p-2 text-rose-600">{r.error_message ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && !busy && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد سجلات في الفترة المختارة.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, icon, danger }: { label: string; value: number; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${danger ? "border-rose-300 bg-rose-50" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ s, delivered, read }: { s: string; delivered: boolean; read: boolean }) {
  const label = read ? "مقروءة" : delivered ? "وصلت" : s;
  const cls =
    s === "dead_letter" || s === "failed" ? "bg-rose-100 text-rose-800" :
    read ? "bg-blue-100 text-blue-800" :
    delivered ? "bg-emerald-100 text-emerald-800" :
    s === "sent" ? "bg-slate-100 text-slate-800" : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}
