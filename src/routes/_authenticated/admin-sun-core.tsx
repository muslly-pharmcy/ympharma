import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  sunListAgents,
  sunListDecisions,
  sunStats,
} from "@/ai/sun-core/sun.functions";
import { sunBridgeStats } from "@/lib/sun-bridge.functions";

export const Route = createFileRoute("/_authenticated/admin-sun-core")({
  head: () => ({
    meta: [
      { title: "☀️ AI SUN CORE — النواة الشمسية" },
      {
        name: "description",
        content: "مركز الرصد الحيّ للنواة الشمسية للذكاء الاصطناعي.",
      },
    ],
  }),
  component: SunCorePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function SunCorePage() {
  const listDecisions = useServerFn(sunListDecisions);
  const listAgents = useServerFn(sunListAgents);
  const stats = useServerFn(sunStats);
  const bridgeStats = useServerFn(sunBridgeStats);

  const decisionsQ = useSuspenseQuery({
    queryKey: ["sun", "decisions"],
    queryFn: () => listDecisions({ data: { limit: 50 } }),
    refetchInterval: 15_000,
  });
  const agentsQ = useSuspenseQuery({
    queryKey: ["sun", "agents"],
    queryFn: () => listAgents(),
    refetchInterval: 30_000,
  });
  const statsQ = useSuspenseQuery({
    queryKey: ["sun", "stats"],
    queryFn: () => stats(),
    refetchInterval: 15_000,
  });
  const bridgeQ = useSuspenseQuery({
    queryKey: ["sun", "bridge"],
    queryFn: () => bridgeStats(),
    refetchInterval: 15_000,
  });

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#0a1810] to-[#005D4F] text-white p-6 space-y-6">
      <header className="flex items-center gap-3">
        <span className="text-4xl">☀️</span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
            AI SUN CORE
          </h1>
          <p className="text-sm text-emerald-200/80">النواة الشمسية للذكاء الاصطناعي — لوحة الرصد الحية</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="أحداث آخر ساعة" value={statsQ.data.lastHour} accent="amber" />
        <StatCard label="متوسط زمن القرار (ms)" value={statsQ.data.avgLatencyMs} accent="emerald" />
        <StatCard label="عدد الوكلاء" value={agentsQ.data.length} accent="sky" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="🤖 الوكلاء المسجَّلون">
          <div className="space-y-2">
            {agentsQ.data.map((a) => (
              <div
                key={a.code}
                className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-3"
              >
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-emerald-200/70">
                    {a.category} · {(a.event_subscriptions ?? []).length} أحداث · ثقة{" "}
                    {statsQ.data.perAgent[a.code] ?? 0} إرسال آخر ساعة
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    a.enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                  }`}
                >
                  {a.enabled ? "نشط" : "معطّل"}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="🧠 آخر القرارات">
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {decisionsQ.data.length === 0 && (
              <div className="text-sm text-emerald-200/60">لا توجد قرارات بعد.</div>
            )}
            {decisionsQ.data.map((d) => (
              <div key={d.id} className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-amber-300">{d.event_name}</span>
                  <span className="text-xs text-emerald-200/60">
                    {new Date(d.created_at).toLocaleTimeString("ar")}
                  </span>
                </div>
                <div className="text-emerald-100/90 mt-1">
                  → {d.agent_dispatched ?? "sun_core"} · ثقة {d.confidence ?? 0}% · {d.latency_ms ?? 0}ms
                </div>
                {d.reasoning && (
                  <div className="text-xs text-emerald-200/70 mt-1">{d.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "emerald" | "sky";
}) {
  const ring =
    accent === "amber"
      ? "ring-amber-400/40"
      : accent === "emerald"
        ? "ring-emerald-400/40"
        : "ring-sky-400/40";
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 ring-1 ${ring} p-5`}>
      <div className="text-sm text-emerald-200/70">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
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
