import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, X, RefreshCw, Pill, ArrowLeft } from "lucide-react";
import {
  listClassificationsAdmin,
  taxonomyStats,
  approveClassification,
  rejectClassification,
  runAiClassifierBatch,
} from "@/lib/pharmacy-intel.functions";

export const Route = createFileRoute("/admin-classifications")({
  head: () => ({
    meta: [
      { title: "تصنيف الأدوية الذكي — صيدلية المصلي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

const CATEGORY_LABELS: Record<string, string> = {
  diabetes: "السكري", hypertension: "الضغط", cardiology: "القلب",
  allergy: "الحساسية", asthma: "الربو", gi: "الجهاز الهضمي",
  antibiotics: "المضادات الحيوية", neurology: "الأعصاب", dermatology: "الجلدية",
  pediatrics: "الأطفال", womens_health: "صحة المرأة", vitamins: "الفيتامينات",
  pain: "المسكنات", respiratory: "الجهاز التنفسي", ophthalmology: "العيون",
  urology: "المسالك البولية", hormonal: "الهرمونات", oncology: "الأورام",
  mental_health: "الصحة النفسية", other: "أخرى",
};

type Row = {
  id: string;
  product_legacy_id: number;
  product_name: string | null;
  brand: string | null;
  image_url: string | null;
  generic_name: string | null;
  active_ingredient: string | null;
  therapeutic_category: string | null;
  pharmacological_class: string | null;
  conditions: string[];
  is_chronic: boolean;
  requires_prescription: boolean;
  confidence: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Stats = {
  products_total: number;
  pending: number;
  approved: number;
  rejected: number;
  unclassified: number;
  by_category: Record<string, number>;
};

function Page() {
  const list = useServerFn(listClassificationsAdmin);
  const getStats = useServerFn(taxonomyStats);
  const approve = useServerFn(approveClassification);
  const reject = useServerFn(rejectClassification);
  const runBatch = useServerFn(runAiClassifierBatch);

  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        list({ data: { status, limit: 200 } }),
        getStats(),
      ]);
      setRows((r as Row[]) ?? []);
      setStats(s as Stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر التحميل");
    } finally {
      setLoading(false);
    }
  }, [list, getStats, status]);

  useEffect(() => { load(); }, [load]);

  async function runAi() {
    setRunning(true);
    const tid = toast.loading(`جاري تصنيف ${batchSize} منتج بالذكاء الاصطناعي...`);
    try {
      const res = await runBatch({ data: { scope: "unclassified", limit: batchSize } }) as { processed: number; upserted: number; skipped: number; message?: string };
      toast.success(`تم: ${res.upserted} مصنّف / ${res.skipped} متخطّى`, { id: tid });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التصنيف", { id: tid });
    } finally {
      setRunning(false);
    }
  }

  async function onApprove(id: string) {
    try {
      await approve({ data: { id } });
      toast.success("تمت الموافقة");
      setRows((prev) => prev.filter((r) => r.id !== id));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    }
  }
  async function onReject(id: string) {
    try {
      await reject({ data: { id } });
      toast.success("تم الرفض");
      setRows((prev) => prev.filter((r) => r.id !== id));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Pill className="size-5 text-primary" />
            <h1 className="text-base font-black sm:text-lg">تصنيف الأدوية الذكي</h1>
          </div>
          <a href="/admin" className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">
            <ArrowLeft className="size-3" /> رجوع للوحة
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {/* Stats */}
        {stats && (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatCard label="إجمالي المنتجات" value={stats.products_total} />
            <StatCard label="غير مصنّف" value={stats.unclassified} tone="warn" />
            <StatCard label="قيد المراجعة" value={stats.pending} tone="info" />
            <StatCard label="معتمد ✓" value={stats.approved} tone="good" />
            <StatCard label="مرفوض" value={stats.rejected} tone="bad" />
          </section>
        )}

        {/* AI runner */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black">
                <Sparkles className="size-4 text-primary" /> تصنيف دفعة جديدة بالذكاء الاصطناعي
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                يستخدم Gemini لتصنيف المنتجات غير المصنّفة. النتائج تذهب لقائمة الانتظار للمراجعة.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold">عدد:</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
                disabled={running}
              >
                {[10, 15, 20, 25, 30].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button
                onClick={runAi}
                disabled={running}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                تشغيل الذكاء الاصطناعي
              </button>
            </div>
          </div>
        </section>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
            >
              {s === "pending" ? "قيد المراجعة" : s === "approved" ? "المعتمد" : "المرفوض"}
            </button>
          ))}
          <button
            onClick={load}
            className="ms-auto flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-accent"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} تحديث
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات في هذه الحالة.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-secondary">
                      <Pill className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black">{r.product_name ?? `#${r.product_legacy_id}`}</h3>
                        <p className="text-[11px] text-muted-foreground">{r.brand ?? "—"}</p>
                      </div>
                      <ConfidencePill value={r.confidence} />
                    </div>

                    <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                      <Field label="الاسم العلمي" value={r.generic_name} />
                      <Field label="المادة الفعالة" value={r.active_ingredient} />
                      <Field label="الفئة العلاجية" value={r.therapeutic_category ? CATEGORY_LABELS[r.therapeutic_category] ?? r.therapeutic_category : null} />
                      <Field label="التصنيف الدوائي" value={r.pharmacological_class} />
                    </div>

                    {r.conditions?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.conditions.map((c) => (
                          <span key={c} className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">{c}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      {r.is_chronic && <span className="rounded-lg bg-orange-500/15 px-2 py-0.5 font-bold text-orange-600">مزمن</span>}
                      {r.requires_prescription && <span className="rounded-lg bg-red-500/15 px-2 py-0.5 font-bold text-red-600">يحتاج وصفة</span>}
                    </div>

                    {r.status === "pending" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => onApprove(r.id)} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700">
                          <Check className="size-3" /> اعتماد
                        </button>
                        <button onClick={() => onReject(r.id)} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-accent">
                          <X className="size-3" /> رفض
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "info" | "bad" }) {
  const colorMap = {
    good: "text-emerald-600",
    warn: "text-orange-600",
    info: "text-primary",
    bad: "text-red-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone ? colorMap[tone] : ""}`}>{value.toLocaleString("ar")}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] font-bold text-muted-foreground">{label}: </span>
      <span className="truncate text-xs font-semibold">{value ?? "—"}</span>
    </div>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-emerald-500/15 text-emerald-600" : value >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600";
  return <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${tone}`}>ثقة {value}%</span>;
}
