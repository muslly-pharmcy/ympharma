// Phase 6C — WhatsApp Delivery & Dispatch admin dashboard.
// Two tabs: delivery_logs (post-send observability) and dispatch (queue).
// Filters: status + time window. Quick links to related order / prescription.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Loader2, RefreshCcw, Send, CheckCheck, Eye, AlertTriangle,
  Package, FileText,
} from "lucide-react";

export const Route = createFileRoute("/admin-whatsapp-delivery")({
  head: () => ({
    meta: [
      { title: "تسليم رسائل واتساب — صيدلية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type LogRow = {
  id: string; message_kind: string; recipient_phone: string; status: string;
  attempts: number | null; error_message: string | null;
  sent_at: string | null; delivered_at: string | null; read_at: string | null;
  failed_at: string | null; created_at: string;
  ref_kind: string | null; ref_id: string | null;
};

type DispatchRow = {
  id: string; event_name: string; recipient_phone: string; status: string;
  attempts: number; max_attempts: number; last_error: string | null;
  sent_at: string | null; next_attempt_at: string;
  order_id: string | null; prescription_id: string | null;
  correlation_id: string | null; created_at: string;
};

type Tab = "logs" | "dispatch";
const LOG_STATUSES = ["all", "queued", "sent", "delivered", "read", "failed"] as const;
const DISP_STATUSES = ["all", "pending", "sending", "sent", "failed", "dead", "skipped"] as const;

function Page() {
  const [tab, setTab] = useState<Tab>("logs");
  const [hours, setHours] = useState(24);
  const [status, setStatus] = useState<string>("all");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [disp, setDisp] = useState<DispatchRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    if (tab === "logs") {
      let q = supabase.from("whatsapp_delivery_logs")
        .select("id,message_kind,recipient_phone,status,attempts,error_message,sent_at,delivered_at,read_at,failed_at,created_at,ref_kind,ref_id")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      setLogs((data ?? []) as LogRow[]);
    } else {
      let q = supabase.from("whatsapp_notification_dispatch")
        .select("id,event_name,recipient_phone,status,attempts,max_attempts,last_error,sent_at,next_attempt_at,order_id,prescription_id,correlation_id,created_at")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      setDisp((data ?? []) as DispatchRow[]);
    }
    setBusy(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, status, tab]);
  useEffect(() => { setStatus("all"); }, [tab]);

  const stats = useMemo(() => {
    if (tab === "logs") {
      const total = logs.length;
      const sent = logs.filter(r => r.sent_at).length;
      const delivered = logs.filter(r => r.delivered_at).length;
      const read = logs.filter(r => r.read_at).length;
      const failed = logs.filter(r => r.status === "failed" || r.failed_at).length;
      const deliveryRate = sent ? Math.round((delivered / sent) * 100) : 0;
      const readRate = delivered ? Math.round((read / delivered) * 100) : 0;
      return { total, sent, delivered, read, failed, deliveryRate, readRate };
    }
    const total = disp.length;
    const pending = disp.filter(r => r.status === "pending" || r.status === "sending").length;
    const sent = disp.filter(r => r.status === "sent").length;
    const failed = disp.filter(r => r.status === "failed" || r.status === "dead").length;
    const skipped = disp.filter(r => r.status === "skipped").length;
    return { total, sent, delivered: pending, read: skipped, failed, deliveryRate: 0, readRate: 0 };
  }, [tab, logs, disp]);

  const statusOptions = tab === "logs" ? LOG_STATUSES : DISP_STATUSES;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" /> الإدارة
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs">
              {statusOptions.map(s => <option key={s} value={s}>{s === "all" ? "كل الحالات" : s}</option>)}
            </select>
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

        <h1 className="mb-3 text-xl font-black">تسليم رسائل واتساب — Phase 6C</h1>

        <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1">
          <TabBtn active={tab === "logs"} onClick={() => setTab("logs")}>سجلات التسليم</TabBtn>
          <TabBtn active={tab === "dispatch"} onClick={() => setTab("dispatch")}>طابور الإرسال</TabBtn>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="إجمالي" value={stats.total} />
          {tab === "logs" ? (
            <>
              <Stat label="أُرسلت" value={stats.sent} icon={<Send className="size-3" />} />
              <Stat label={`تسليم ${stats.deliveryRate}%`} value={stats.delivered} icon={<CheckCheck className="size-3 text-emerald-600" />} />
              <Stat label={`قراءة ${stats.readRate}%`} value={stats.read} icon={<Eye className="size-3 text-blue-600" />} />
              <Stat label="فشل" value={stats.failed} icon={<AlertTriangle className="size-3 text-rose-600" />} danger={stats.failed > 0} />
            </>
          ) : (
            <>
              <Stat label="قيد الإرسال" value={stats.delivered} icon={<Loader2 className="size-3" />} />
              <Stat label="تم الإرسال" value={stats.sent} icon={<Send className="size-3" />} />
              <Stat label="متجاهَل (opt-out)" value={stats.read} />
              <Stat label="فشل/متروك" value={stats.failed} icon={<AlertTriangle className="size-3 text-rose-600" />} danger={stats.failed > 0} />
            </>
          )}
        </div>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          {tab === "logs" ? <LogsTable rows={logs} busy={busy} /> : <DispatchTable rows={disp} busy={busy} />}
        </section>
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function LogsTable({ rows, busy }: { rows: LogRow[]; busy: boolean }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-secondary/50 text-right text-[11px]">
        <tr>
          <th className="p-2">الوقت</th>
          <th className="p-2">النوع</th>
          <th className="p-2">المستلم</th>
          <th className="p-2">الحالة</th>
          <th className="p-2">محاولات</th>
          <th className="p-2">مرجع</th>
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
            <td className="p-2"><RefLink kind={r.ref_kind} id={r.ref_id} /></td>
            <td className="p-2 text-rose-600">{r.error_message ?? "—"}</td>
          </tr>
        ))}
        {!rows.length && !busy && (
          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد سجلات في الفترة/الحالة المختارة.</td></tr>
        )}
      </tbody>
    </table>
  );
}

function DispatchTable({ rows, busy }: { rows: DispatchRow[]; busy: boolean }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-secondary/50 text-right text-[11px]">
        <tr>
          <th className="p-2">الوقت</th>
          <th className="p-2">الحدث</th>
          <th className="p-2">المستلم</th>
          <th className="p-2">الحالة</th>
          <th className="p-2">محاولات</th>
          <th className="p-2">التالي</th>
          <th className="p-2">مرجع</th>
          <th className="p-2">الخطأ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border/50 align-top">
            <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
            <td className="p-2 font-bold">{r.event_name}</td>
            <td className="p-2 font-mono">{r.recipient_phone}</td>
            <td className="p-2"><StatusBadge s={r.status} delivered={false} read={false} /></td>
            <td className="p-2 text-center">{r.attempts}/{r.max_attempts}</td>
            <td className="p-2 whitespace-nowrap text-muted-foreground">{r.status === "pending" || r.status === "failed" ? new Date(r.next_attempt_at).toLocaleTimeString("ar") : "—"}</td>
            <td className="p-2"><RefLink kind={r.order_id ? "order" : r.prescription_id ? "prescription" : null} id={r.order_id ?? r.prescription_id} /></td>
            <td className="p-2 text-rose-600">{r.last_error ?? "—"}</td>
          </tr>
        ))}
        {!rows.length && !busy && (
          <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد رسائل في الطابور.</td></tr>
        )}
      </tbody>
    </table>
  );
}

function RefLink({ kind, id }: { kind: string | null; id: string | null }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  if (kind === "order") {
    return (
      <Link to="/admin" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
        <Package className="size-3" /><span className="font-mono">{id.slice(0, 10)}</span>
      </Link>
    );
  }
  if (kind === "prescription") {
    return (
      <Link to="/admin-rx-review" search={{}} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
        <FileText className="size-3" /><span className="font-mono">{id.slice(0, 10)}</span>
      </Link>
    );
  }
  return <span className="font-mono text-muted-foreground">{id.slice(0, 10)}</span>;
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
    s === "dead" || s === "dead_letter" || s === "failed" ? "bg-rose-100 text-rose-800" :
    s === "skipped" ? "bg-zinc-100 text-zinc-700" :
    read ? "bg-blue-100 text-blue-800" :
    delivered ? "bg-emerald-100 text-emerald-800" :
    s === "sent" ? "bg-slate-100 text-slate-800" :
    s === "sending" ? "bg-indigo-100 text-indigo-800" :
    "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}
