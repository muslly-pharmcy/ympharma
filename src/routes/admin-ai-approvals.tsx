// Phase 6D — Admin approvals for AI agent actions
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Check, X, Loader2, RefreshCcw, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin-ai-approvals")({
  head: () => ({ meta: [{ title: "موافقات وكيل AI — صيدلية" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Row = {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  correlation_id: string | null;
  user_phone: string | null;
  action_type: string;
  payload: Record<string, unknown>;
  customer_message: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
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

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    let q = supabase
      .from("agent_approval_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setBusy(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const note = window.prompt(status === "approved" ? "ملاحظة الموافقة (اختياري)" : "سبب الرفض (اختياري)") ?? "";
    setActing(id);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("agent_approval_requests")
      .update({
        status,
        decided_by: userRes?.user?.id ?? null,
        decided_at: new Date().toISOString(),
        decision_note: note || null,
      })
      .eq("id", id)
      .eq("status", "pending");
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
    load();
  };

  const counts = useMemo(() => ({
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
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />} تحديث
          </button>
        </div>

        <header className="mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><ShieldAlert className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black">موافقات وكيل AI — Phase 6D</h1>
              <p className="text-xs text-white/85">طلبات يجب أن يقرها موظف بشري قبل التنفيذ (إنشاء طلب، موافقة روشتة، مخزون، تحويلات)</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/20 px-2 py-1">معلّق: {counts.pending}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">مقبول: {counts.approved}</span>
            <span className="rounded-full bg-white/20 px-2 py-1">مرفوض: {counts.rejected}</span>
          </div>
        </header>

        <div className="mb-3 flex gap-2">
          {(["pending","all"] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${filter===k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              {k === "pending" ? "المعلّقة فقط" : "الكل"}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {rows.map((r) => (
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
              <details className="rounded-xl bg-secondary/40 p-2 text-xs">
                <summary className="cursor-pointer font-bold">تفاصيل الطلب (payload)</summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(r.payload, null, 2)}</pre>
                {r.correlation_id && <p className="mt-1 text-muted-foreground">correlation: <span className="font-mono">{r.correlation_id}</span></p>}
              </details>
              {r.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button disabled={acting===r.id} onClick={() => decide(r.id, "approved")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                    <Check className="size-3" /> موافقة
                  </button>
                  <button disabled={acting===r.id} onClick={() => decide(r.id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                    <X className="size-3" /> رفض
                  </button>
                </div>
              ) : r.decided_at && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  قرار بواسطة <span className="font-mono">{r.decided_by?.slice(0,8) ?? "—"}</span> في {new Date(r.decided_at).toLocaleString("ar")}
                  {r.decision_note && <> — {r.decision_note}</>}
                </p>
              )}
            </article>
          ))}
          {!rows.length && !busy && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد طلبات موافقة.</p>
          )}
        </section>
      </main>
    </div>
  );
}
