import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Send, X, Check, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listMarketingQueue,
  approveQueueItem,
  skipQueueItem,
  markQueueSent,
} from "@/lib/pharmacy-intel-admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-marketing")({
  head: () => ({
    meta: [
      { title: "قائمة الحملات — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketingQueue,
});

type Item = {
  id: string;
  campaign_kind: string;
  customer_phone: string;
  customer_name: string | null;
  segment: string | null;
  reason: string | null;
  message_text: string | null;
  status: string;
  generated_at: string;
  sent_at: string | null;
  value_score: number | null;
  risk_score: number | null;
  payload: Record<string, unknown>;
};

const KIND_LABELS: Record<string, string> = {
  dormant: "خامل",
  refill_due: "إعادة صرف",
  declining: "بدأ يتراجع",
  abandoned_cart: "سلة متروكة",
};

const STATUS_TABS: { key: "pending" | "approved" | "sent" | "skipped" | "failed"; label: string }[] = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "معتمدة" },
  { key: "sent", label: "أُرسلت" },
  { key: "skipped", label: "متجاهلة" },
  { key: "failed", label: "فاشلة" },
];

function normalizePhone(raw: string): string {
  const d = (raw || "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("967")) return d;
  if (d.startsWith("0")) return "967" + d.slice(1);
  if (d.length === 9) return "967" + d;
  return d;
}

function MarketingQueue() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "sent" | "skipped" | "failed">("pending");
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useServerFn(listMarketingQueue);
  const approve = useServerFn(approveQueueItem);
  const skip = useServerFn(skipQueueItem);
  const markSent = useServerFn(markQueueSent);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await list({ data: { status: tab, limit: 300 } });
      setRows(r as Item[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحميل القائمة");
    } finally {
      setLoading(false);
    }
  }, [list, tab]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (authed === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <Link to="/admin" className="text-primary underline">يلزم تسجيل الدخول</Link>
      </div>
    );
  }
  if (authed === null) return <Center><Loader2 className="size-6 animate-spin text-primary" /></Center>;

  const onApprove = async (id: string) => {
    setBusyId(id);
    try { await approve({ data: { id } }); toast.success("تم الاعتماد"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
    finally { setBusyId(null); }
  };
  const onSkip = async (id: string) => {
    setBusyId(id);
    try { await skip({ data: { id } }); toast.success("تم التجاهل"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
    finally { setBusyId(null); }
  };
  const onSend = async (it: Item) => {
    const phone = normalizePhone(it.customer_phone);
    if (!phone) { toast.error("رقم هاتف غير صالح"); return; }
    const text = encodeURIComponent(it.message_text ?? "مرحباً من صيدلية المصلي");
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener");
    setBusyId(it.id);
    try { await markSent({ data: { id: it.id } }); toast.success("تم تسجيل الإرسال"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "تم الفتح، لكن تعذر التسجيل"); }
    finally { setBusyId(null); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">قائمة الحملات</h1>
            <p className="text-xs text-muted-foreground">معتمدة يدوياً قبل الإرسال — WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تحديث">
              <RefreshCw className="size-4" />
            </button>
            <Link to="/admin-command" className="grid size-9 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="قيادة">
              <ArrowLeft className="size-4 rotate-180" />
            </Link>
          </div>
        </header>

        <nav className="flex flex-wrap gap-1 rounded-xl bg-secondary/40 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <Center><Loader2 className="size-6 animate-spin text-primary" /></Center>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            لا توجد عناصر في هذه الحالة
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((it) => (
              <li key={it.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                        {KIND_LABELS[it.campaign_kind] ?? it.campaign_kind}
                      </span>
                      {it.segment && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {it.segment}
                        </span>
                      )}
                      {it.value_score != null && (
                        <span className="text-[10px] text-muted-foreground">قيمة: {it.value_score}</span>
                      )}
                      {it.risk_score != null && (
                        <span className="text-[10px] text-muted-foreground">مخاطرة: {it.risk_score}</span>
                      )}
                    </div>
                    <div className="mt-1 font-bold">{it.customer_name ?? "—"} <span className="text-xs font-normal text-muted-foreground">• {it.customer_phone}</span></div>
                    <div className="mt-1 text-xs text-muted-foreground">{it.reason}</div>
                    {it.message_text && (
                      <p className="mt-2 rounded-xl bg-secondary/40 p-2 text-sm">{it.message_text}</p>
                    )}
                    {it.sent_at && (
                      <p className="mt-1 text-[10px] text-emerald-600">أُرسلت: {new Date(it.sent_at).toLocaleString("ar")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {it.status === "pending" && (
                      <>
                        <button onClick={() => onApprove(it.id)} disabled={busyId === it.id} className="flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/25 disabled:opacity-50">
                          <Check className="size-3.5" /> اعتماد
                        </button>
                        <button onClick={() => onSkip(it.id)} disabled={busyId === it.id} className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50">
                          <X className="size-3.5" /> تجاهل
                        </button>
                      </>
                    )}
                    {it.status === "approved" && (
                      <>
                        <button onClick={() => onSend(it)} disabled={busyId === it.id} className="flex items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                          {busyId === it.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                          إرسال واتساب
                        </button>
                        <button onClick={() => onSkip(it.id)} disabled={busyId === it.id} className="grid size-7 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="تجاهل">
                          <X className="size-3.5" />
                        </button>
                      </>
                    )}
                    {it.status === "sent" && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                        <MessageCircle className="size-3.5" /> أُرسلت
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background">{children}</div>;
}
