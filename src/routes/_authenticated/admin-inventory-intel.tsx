import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listHealthScores,
  listOpenRecommendations,
  intelligenceStats,
  recomputeNow,
} from "@/modules/inventory-intelligence";

export const Route = createFileRoute("/_authenticated/admin-inventory-intel")({
  head: () => ({
    meta: [
      { title: "📦 Inventory Intelligence — عقل المخزون" },
      { name: "description", content: "لوحة عقل المخزون الذكي" },
    ],
  }),
  component: Page,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذّر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

type HealthRow = {
  product_id: string;
  score: number;
  status: "healthy" | "warning" | "critical" | "dead";
  velocity_daily: number;
  days_of_cover: number | null;
  current_qty: number;
  recommendation: string | null;
  products: { name: string; category: string; price: number };
};

type RecRow = {
  id: string;
  product_id: string;
  recommended_qty: number;
  reason: string;
  urgency: string;
  expected_stockout_at: string | null;
  products: { name: string; category: string };
};

function Page() {
  const qc = useQueryClient();
  const listHealth = useServerFn(listHealthScores);
  const listRecs = useServerFn(listOpenRecommendations);
  const stats = useServerFn(intelligenceStats);
  const recompute = useServerFn(recomputeNow);

  const healthQ = useSuspenseQuery({
    queryKey: ["intel", "health"],
    queryFn: () => listHealth({ data: { limit: 20 } }) as Promise<HealthRow[]>,
    refetchInterval: 60_000,
  });
  const recsQ = useSuspenseQuery({
    queryKey: ["intel", "recs"],
    queryFn: () => listRecs() as Promise<RecRow[]>,
    refetchInterval: 60_000,
  });
  const statsQ = useSuspenseQuery({
    queryKey: ["intel", "stats"],
    queryFn: () => stats(),
    refetchInterval: 30_000,
  });

  const recomputeMut = useMutation({
    mutationFn: () => recompute(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["intel"] }),
  });

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#0a1810] to-[#005D4F] text-white p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
            📦 Inventory Intelligence
          </h1>
          <p className="text-sm text-emerald-200/80 mt-1">عقل المخزون التشغيلي — Phase 6A</p>
        </div>
        <button
          onClick={() => recomputeMut.mutate()}
          disabled={recomputeMut.isPending}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-50"
        >
          {recomputeMut.isPending ? "…جاري الحساب" : "احسب الآن"}
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="سليم" value={statsQ.data.totals.healthy} color="emerald" />
        <Stat label="تنبيه" value={statsQ.data.totals.warning} color="amber" />
        <Stat label="حرج" value={statsQ.data.totals.critical} color="red" />
        <Stat label="راكد" value={statsQ.data.totals.dead} color="zinc" />
        <Stat label="توصيات مفتوحة" value={statsQ.data.openRecs} color="sky" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="🚨 المنتجات الأدنى صحة (Top 20)">
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {healthQ.data.map((h) => (
              <div key={h.product_id} className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-semibold flex-1">{h.products.name}</div>
                  <StatusBadge s={h.status} />
                </div>
                <div className="text-xs text-emerald-200/70 mt-1">
                  {h.products.category} · متوفر {h.current_qty} وحدة · بيع {h.velocity_daily}/يوم ·
                  تغطية {h.days_of_cover ?? "—"} يوم · درجة {h.score}
                </div>
                {h.recommendation && (
                  <div className="text-xs text-amber-300/90 mt-1">💡 {h.recommendation}</div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="🛒 توصيات الشراء المفتوحة">
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {recsQ.data.length === 0 && (
              <div className="text-sm text-emerald-200/60">لا توجد توصيات مفتوحة الآن.</div>
            )}
            {recsQ.data.map((r) => (
              <div key={r.id} className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                <div className="flex justify-between">
                  <div className="font-semibold">{r.products.name}</div>
                  <UrgencyBadge u={r.urgency} />
                </div>
                <div className="text-xs text-emerald-200/80 mt-1">
                  الكمية المقترحة: <b>{r.recommended_qty}</b> وحدة
                </div>
                <div className="text-xs text-emerald-200/70 mt-1">{r.reason}</div>
                {r.expected_stockout_at && (
                  <div className="text-xs text-red-300/90 mt-1">
                    نفاد متوقع: {new Date(r.expected_stockout_at).toLocaleDateString("ar")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const ring: Record<string, string> = {
    emerald: "ring-emerald-400/40",
    amber: "ring-amber-400/40",
    red: "ring-red-400/40",
    zinc: "ring-zinc-400/40",
    sky: "ring-sky-400/40",
  };
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 ring-1 ${ring[color]} p-4`}>
      <div className="text-xs text-emerald-200/70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-black/20 backdrop-blur border border-white/10 p-5">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}
function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    healthy: "bg-emerald-500/20 text-emerald-200",
    warning: "bg-amber-500/20 text-amber-200",
    critical: "bg-red-500/20 text-red-200",
    dead: "bg-zinc-500/20 text-zinc-200",
  };
  return <span className={`text-xs px-2 py-1 rounded ${map[s]}`}>{s}</span>;
}
function UrgencyBadge({ u }: { u: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/30 text-red-100",
    high: "bg-orange-500/30 text-orange-100",
    medium: "bg-amber-500/30 text-amber-100",
    low: "bg-sky-500/30 text-sky-100",
    dead_stock: "bg-zinc-500/30 text-zinc-100",
  };
  return <span className={`text-xs px-2 py-1 rounded ${map[u]}`}>{u}</span>;
}
