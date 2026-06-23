// Phase 6D++ — Admin approvals with filters, search, CSV export, KPI panel,
// and WhatsApp customer notification via server function.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { decideApproval } from "@/lib/ai-approvals.functions";
import { toast } from "sonner";
import { ArrowRight, Check, X, Loader2, RefreshCcw, ShieldAlert, Download, Search } from "lucide-react";

export const Route = createFileRoute("/admin-ai-approvals")({
  head: () => ({ meta: [{ title: "موافقات وكيل AI — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Status = "pending" | "approved" | "rejected" | "expired";

type Row = {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  correlation_id: string | null;
  user_phone: string | null;
  action_type: string;
  payload: Record<string, unknown>;
  customer_message: string | null;
  status: Status;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  create_order: "إنشاء طلب",
  approve_prescription: "موافقة على روشتة",
  inventory_change: "تعديل مخزون",
  transfer: "تحويل بين فروع",
  price_change: "تعديل سعر",
  refund: "استرجاع",
};

type Filter = "pending" | "approved" | "rejected" | "all";

function toCSV(rows: Row[]): string {
  const headers = [
    "id", "created_at", "status", "action_type", "user_phone",
    "conversation_id", "correlation_id", "decided_by", "decided_at",
    "decision_note", "customer_message", "payload",
  ];
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as unknown as Record<string, unknown>)[h])).join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [q, setQ] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const decide = useServerFn(decideApproval);

  const load = async () => {
    setBusy(true);
    let query = supabase
      .from("agent_approval_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setBusy(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.user_phone, r.action_type, r.customer_message, r.decision_note, r.id, r.correlation_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
      || JSON.stringify(r.payload ?? {}).toLowerCase().includes(term)
    );
  }, [rows, q]);

  const onDecide = async (id: string, status: "approved" | "rejected") => {
    const note = window.prompt(status === "approved" ? "ملاحظة الموافقة (اختياري)" : "سبب الرفض (مطلوب للعميل)") ?? "";
    if (status === "rejected" && !note.trim()) { toast.error("الرجاء كتابة سبب الرفض"); return; }
    setActing(id);
    try {
      const res = await decide({ data: { id, status, note: note || null } });
      toast.success(
        status === "approved"
          ? (res?.notified ? "تمت الموافقة وأُرسل إشعار واتساب" : "تمت الموافقة")
          : (res?.notified ? "تم الرفض وأُرسل إشعار واتساب" : "تم الرفض")
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تنفيذ القرار");
    } finally {
      setActing(null);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-approvals-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // KPIs across the loaded set
  const kpi = useMemo(() => {
    const byAction: Record<string, { pending: number; approved: number; rejected: number }> = {};
    let approvedDurMs = 0, approvedCount = 0, totalDecided = 0, rejectedCount = 0;
    for (const r of rows) {
      const a = (byAction[r.action_type] ||= { pending: 0, approved: 0, rejected: 0 });
      if (r.status === "pending") a.pending++;
      else if (r.status === "approved") {
        a.approved++; approvedCount++; totalDecided++;
        if (r.decided_at) approvedDurMs += (new Date(r.decided_at).getTime() - new Date(r.created_at).getTime());
      } else if (r.status === "rejected") {
        a.rejected++; rejectedCount++; totalDecided++;
      }
    }
    const avgMin = approvedCount ? Math.round(approvedDurMs / approvedCount / 60000) : 0;
    const rejectRate = totalDecided ? Math.round((rejectedCount / totalDecided) * 100) : 0;
    return { byAction, avgMin, rejectRate, approvedCount, rejectedCount };
  }, [rows]);

  const totals = useMemo(() => ({
    pending: rows.filter(r => r.status === "pending").length,
    approved: rows.filter(r => r.status === "approved").length,
    rejected: rows.filter(r => r.status === "rejected").length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" /> الإدارة
          </Link>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold">
              <Download className="size-3" /> CSV
            </button>
            <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />} تحديث
            </button>
          </div>
        </div>

        <header className="mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><ShieldAlert className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black">موافقات وكيل AI — Phase 6D</h1>
              <p className="text-xs text-white/85">طلبات يجب أن يقرها موظف بشري قبل التنفيذ</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/20 px-2 py-1">معلّق: {totals.pending}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">مقبول: {totals.approved}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">مرفوض: {totals.rejected}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">متوسط الموافقة: {kpi.avgMin} د</span>
            <span className="rounded-full bg-white/20 px-2 py-1">نسبة الرفض: {kpi.rejectRate}%</span>
          </div>
        </header>

        {/* KPI panel by action */}
        <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(kpi.byAction).map(([action, c]) => (
            <div key={action} className="rounded-xl border border-border bg-card p-3 text-xs">
              <p className="mb-1 font-black">{ACTION_LABEL[action] ?? action}</p>
              <p className="text-amber-700">معلّق: {c.pending}</p>
              <p className="text-emerald-700">مقبول: {c.approved}</p>
              <p className="text-rose-700">مرفوض: {c.rejected}</p>
            </div>
          ))}
          {!Object.keys(kpi.byAction).length && (
            <p className="col-span-full rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">لا توجد بيانات.</p>
          )}
        </section>

        {/* Filters + search */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              {k === "pending" ? "معلّق" : k === "approved" ? "مقبول" : k === "rejected" ? "مرفوض" : "الكل"}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث: هاتف، نوع، ملاحظة، payload…"
              className="w-64 rounded-lg border border-border bg-background px-7 py-1.5 text-xs"
            />
          </div>
        </div>

        <section className="space-y-3">
          {filtered.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">{ACTION_LABEL[r.action_type] ?? r.action_type}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${
                  r.status === "pending" ? "bg-amber-100 text-amber-800" :
                  r.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                  r.status === "rejected" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600"
                }`}>{r.status}</span>
                {r.user_phone && <span className="rounded-full bg-secondary px-2 py-0.5 font-mono">{r.user_phone}</span>}
                <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
              </div>
              {r.customer_message && <p className="mb-2 text-sm">{r.customer_message}</p>}
              {r.action_type === "approve_prescription" && <PrescriptionPreview payload={r.payload} />}
              <details className="rounded-xl bg-secondary/40 p-2 text-xs">
                <summary className="cursor-pointer font-bold">تفاصيل الطلب (payload)</summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(r.payload, null, 2)}</pre>
                {r.correlation_id && <p className="mt-1 text-muted-foreground">correlation: <span className="font-mono">{r.correlation_id}</span></p>}
              </details>
              {r.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button disabled={acting === r.id} onClick={() => onDecide(r.id, "approved")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                    <Check className="size-3" /> موافقة + إشعار
                  </button>
                  <button disabled={acting === r.id} onClick={() => onDecide(r.id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                    <X className="size-3" /> رفض + إشعار
                  </button>
                </div>
              ) : r.decided_at && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  قرار بواسطة <span className="font-mono">{r.decided_by?.slice(0, 8) ?? "—"}</span> في {new Date(r.decided_at).toLocaleString("ar")}
                  {r.decision_note && <> — {r.decision_note}</>}
                </p>
              )}
            </article>
          ))}
          {!filtered.length && !busy && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد طلبات.</p>
          )}
        </section>
      </main>
    </div>
  );
}
