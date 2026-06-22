// Admin dashboard: WhatsApp conversation log.
// Shows phone, last_message (truncated), last_intent, status, last_message_at.
// Filterable by phone search and status. Read-only.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, RefreshCcw, Search } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AdminGate } from "@/components/admin/AdminGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-whatsapp-conversations")({
  head: () => ({
    meta: [
      { title: "محادثات واتساب — الإدارة" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <Page />
    </AdminGate>
  ),
});

type Row = {
  id: string;
  phone_number: string;
  status: string;
  last_intent: string | null;
  last_message: string | null;
  last_message_at: string;
  updated_at: string;
};

const STATUSES = ["all", "active", "escalated", "closed"] as const;
type StatusFilter = (typeof STATUSES)[number];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `قبل ${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

function intentLabel(intent: string | null): string {
  if (!intent) return "—";
  const map: Record<string, string> = {
    product_search: "🔍 بحث",
    check_stock: "📦 مخزون",
    most_available: "🏆 الأكثر توفراً",
    order_status: "📦 حالة طلب",
    prescription_status: "💊 حالة روشتة",
    branch_availability: "🏪 فروع",
    branches: "🏪 فروع",
    escalation: "🚨 تصعيد",
    error: "⚠️ خطأ",
    request_create_order: "🛒 طلب جديد (انتظار موافقة)",
    request_approve_prescription: "💊 موافقة روشتة (انتظار)",
    request_inventory_change: "📦 تعديل مخزون (انتظار)",
    request_transfer: "🔄 تحويل (انتظار)",
  };
  return map[intent] ?? intent;
}

function statusBadge(status: string): { text: string; cls: string } {
  switch (status) {
    case "active":
      return { text: "نشطة", cls: "bg-emerald-100 text-emerald-800" };
    case "escalated":
      return { text: "مُصعّدة", cls: "bg-amber-100 text-amber-800" };
    case "closed":
      return { text: "مغلقة", cls: "bg-secondary text-muted-foreground" };
    default:
      return { text: status, cls: "bg-secondary text-muted-foreground" };
  }
}

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("whatsapp_conversations")
        .select("id, phone_number, status, last_intent, last_message, last_message_at, updated_at")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (!alive) return;
      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [status, tick]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.phone_number.includes(t) ||
        (r.last_message ?? "").toLowerCase().includes(t.toLowerCase()) ||
        (r.last_intent ?? "").toLowerCase().includes(t.toLowerCase()),
    );
  }, [rows, q]);

  const counts = useMemo(() => {
    const c = { total: rows.length, active: 0, escalated: 0, missing: 0 };
    for (const r of rows) {
      if (r.status === "active") c.active++;
      else if (r.status === "escalated") c.escalated++;
      if (!r.last_message) c.missing++;
    }
    return c;
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <MessageSquare className="size-7 text-primary" /> محادثات واتساب
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              آخر 200 محادثة مرتّبة حسب آخر رسالة. للبحث: رقم، نص الرسالة، أو النية.
            </p>
          </div>
          <button
            onClick={() => setTick((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm font-black hover:bg-accent"
          >
            <RefreshCcw className="size-4" /> تحديث
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="إجمالي" value={counts.total} />
          <Stat label="نشطة" value={counts.active} />
          <Stat label="مُصعّدة" value={counts.escalated} accent />
          <Stat label="بدون last_message" value={counts.missing} warn />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث برقم/رسالة/نية..."
              className="w-full rounded-2xl border border-border bg-secondary/60 ps-4 pe-10 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 rounded-2xl bg-secondary/60 p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "الكل" : statusBadge(s).text}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">خطأ: {error}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs">
                <tr>
                  <th className="px-3 py-2 text-start">رقم العميل</th>
                  <th className="px-3 py-2 text-start">آخر رسالة</th>
                  <th className="px-3 py-2 text-start">النية</th>
                  <th className="px-3 py-2 text-start">الحالة</th>
                  <th className="px-3 py-2 text-start whitespace-nowrap">منذ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sb = statusBadge(r.status);
                  return (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-mono text-xs font-bold" dir="ltr">{r.phone_number}</td>
                      <td className="px-3 py-2 max-w-md">
                        {r.last_message ? (
                          <span className="line-clamp-2 text-foreground">{r.last_message}</span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">— فارغ</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{intentLabel(r.last_intent)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${sb.cls}`}>{sb.text}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground" title={r.last_message_at}>
                        {timeAgo(r.last_message_at)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  const cls = accent
    ? "brand-gradient text-primary-foreground"
    : warn && value > 0
      ? "bg-red-50 border-red-200"
      : "bg-card";
  return (
    <div className={`rounded-2xl border border-border p-4 ${cls}`}>
      <p className={`text-xs ${accent ? "opacity-90" : warn && value > 0 ? "text-red-700" : "text-muted-foreground"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-black ${warn && value > 0 ? "text-red-700" : ""}`}>{value.toLocaleString("ar-EG")}</p>
    </div>
  );
}
