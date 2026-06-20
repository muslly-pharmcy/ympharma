// Phase 7 — Failures-only viewer for prescription extractions
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCcw, Search } from "lucide-react";

export const Route = createFileRoute("/admin-ai-extraction-failures")({
  head: () => ({
    meta: [
      { title: "أعطال استخراج الروشتات — صيدلية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Row = {
  id: string;
  prescription_id: string;
  source_type: "prescription" | "insurance";
  status: string;
  model_tier: string | null;
  attempts: number;
  confidence: number | null;
  error: string | null;
  created_at: string;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("prescription_extractions")
      .select("id, prescription_id, source_type, status, model_tier, attempts, confidence, error, created_at")
      .in("status", ["failed", "review"])
      .order("created_at", { ascending: false })
      .limit(200);
    setBusy(false);
    if (!error) setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    !q.trim() || r.prescription_id.toLowerCase().includes(q.toLowerCase()) ||
    (r.error ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-black">
            <AlertTriangle className="size-5 text-amber-600" /> أعطال استخراج الروشتات
          </h1>
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-black">
            <RefreshCcw className={`size-3 ${busy ? "animate-spin" : ""}`} /> تحديث
          </button>
        </header>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بمعرّف الروشتة أو نص الخطأ"
            className="flex-1 bg-transparent text-sm outline-none" />
          <span className="text-xs text-muted-foreground">{filtered.length} نتيجة</span>
        </div>

        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-3 text-xs">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-black ${
                  r.status === "failed" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                }`}>{r.status}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">
                  {r.source_type === "insurance" ? "تأمين" : "روشتة"}
                </span>
                {r.model_tier && <span className="rounded-full bg-secondary px-2 py-0.5">tier: {r.model_tier}</span>}
                {r.confidence != null && (
                  <span className="rounded-full bg-secondary px-2 py-0.5">ثقة: {r.confidence}%</span>
                )}
                <span className="rounded-full bg-secondary px-2 py-0.5">محاولات: {r.attempts}</span>
                <span className="ms-auto text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar")}
                </span>
              </div>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">{r.prescription_id}</div>
              {r.error && (
                <pre className="mb-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-rose-50 p-2 text-[11px] text-rose-900">
                  {r.error}
                </pre>
              )}
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin-rx-extraction-edit"
                  search={{ prescriptionId: r.prescription_id }}
                  className="rounded-lg bg-primary px-2 py-1 font-black text-primary-foreground"
                >
                  تعديل/اعتماد
                </Link>
                <Link
                  to="/admin-rx-review"
                  search={{ tab: "IN_REVIEW", q: "", page: 1, rx: r.prescription_id }}
                  className="rounded-lg bg-secondary px-2 py-1 font-black"
                >
                  مراجعة الروشتة
                </Link>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              لا توجد أعطال حالياً.
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
