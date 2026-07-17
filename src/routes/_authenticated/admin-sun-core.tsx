import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  sunListAgents,
  sunListDecisions,
  sunStats,
} from "@/ai/sun-core/sun.functions";
import { sunBridgeStats } from "@/lib/sun-bridge.functions";
import {
  submitAiFeedback,
  listRecentAiDecisions,
} from "@/lib/ai-feedback.functions";
import { listAgentMemory, listMemoryAgents } from "@/lib/sun-memory.functions";
import { neuralSearch, neuralStatus } from "@/lib/ai-neural.functions";

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

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Phoenix Bridge Lag" value={bridgeQ.data.bridgeLag} accent="amber" />
        <StatCard label="Sun Queue Pending" value={bridgeQ.data.sunPending} accent="emerald" />
        <StatCard label="Sun Failed" value={bridgeQ.data.sunFailed} accent="sky" />
        <StatCard
          label="آخر قرار"
          value={
            bridgeQ.data.lastDecisionAt
              ? Math.max(
                  0,
                  Math.round(
                    (Date.now() - new Date(bridgeQ.data.lastDecisionAt).getTime()) / 1000,
                  ),
                )
              : 0
          }
          accent="emerald"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="🌉 Phoenix ↔ Sun Bridge (v1.2)">
          <div className="text-sm text-emerald-100/90 space-y-2">
            <div>
              آخر قرار من الوكيل:{" "}
              <span className="text-amber-300">
                {bridgeQ.data.lastDecisionAgent ?? "—"}
              </span>{" "}
              {bridgeQ.data.lastDecisionAt
                ? `(${new Date(bridgeQ.data.lastDecisionAt).toLocaleString("ar")})`
                : ""}
            </div>
            <div>
              قرارات آخر 24 ساعة (per-agent):
              <ul className="mt-1 space-y-1">
                {Object.entries(bridgeQ.data.perAgent24h).length === 0 && (
                  <li className="text-emerald-200/60">لا توجد قرارات بعد.</li>
                )}
                {Object.entries(bridgeQ.data.perAgent24h).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-white/5 py-1">
                    <span>{k}</span>
                    <span className="text-amber-300">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-emerald-200/60 pt-2">
              يعمل عبر <code>POST /api/public/ai/sun-tick</code> كل دقيقة (pg_cron).
            </div>
          </div>
        </Panel>

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

      <MemoryAndFeedbackSection />
      <NeuralSearchSection />
    </div>
  );
}

/* ============================================================ */
/* Phase 1.3 — Experience Memory + Feedback on ai_decisions      */
/* ============================================================ */
function MemoryAndFeedbackSection() {
  const qc = useQueryClient();
  const listMem = useServerFn(listAgentMemory);
  const listAgents = useServerFn(listMemoryAgents);
  const listRecent = useServerFn(listRecentAiDecisions);
  const submitFb = useServerFn(submitAiFeedback);

  const [agentFilter, setAgentFilter] = useState<string>("");

  const agentsQ = useQuery({
    queryKey: ["ai-mem", "agents"],
    queryFn: () => listAgents(),
    refetchInterval: 60_000,
  });

  const memQ = useQuery({
    queryKey: ["ai-mem", "list", agentFilter],
    queryFn: () =>
      listMem({ data: agentFilter ? { agent: agentFilter, limit: 30 } : { limit: 30 } }),
    refetchInterval: 20_000,
  });

  const decisionsQ = useQuery({
    queryKey: ["ai-decisions", "recent"],
    queryFn: () => listRecent({ data: { limit: 20 } }),
    refetchInterval: 15_000,
  });

  const fbMut = useMutation({
    mutationFn: (v: { decisionId: string; rating: number }) =>
      submitFb({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-decisions", "recent"] }),
  });

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="🧠 ذاكرة الخبرة (Experience Memory)">
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setAgentFilter("")}
            className={`text-xs px-3 py-1 rounded-full border ${
              agentFilter === ""
                ? "bg-amber-400/30 border-amber-300 text-amber-100"
                : "bg-white/5 border-white/10 text-emerald-100/70 hover:bg-white/10"
            }`}
          >
            الكل
          </button>
          {(agentsQ.data ?? []).map((a) => (
            <button
              key={a.agent_name}
              onClick={() => setAgentFilter(a.agent_name)}
              className={`text-xs px-3 py-1 rounded-full border ${
                agentFilter === a.agent_name
                  ? "bg-amber-400/30 border-amber-300 text-amber-100"
                  : "bg-white/5 border-white/10 text-emerald-100/70 hover:bg-white/10"
              }`}
            >
              {a.agent_name} · {a.count}
            </button>
          ))}
        </div>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {(memQ.data ?? []).length === 0 && (
            <div className="text-sm text-emerald-200/60">لا توجد ذاكرة بعد.</div>
          )}
          {(memQ.data ?? []).map((m: any) => (
            <div
              key={m.id}
              className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm"
            >
              <div className="flex justify-between">
                <span className="font-semibold text-amber-300">{m.agent_name}</span>
                <span className="text-xs text-emerald-200/60">
                  {m.memory_type} · أهمية {Math.round((Number(m.importance) || 0) * 100)}%
                </span>
              </div>
              <pre className="text-xs text-emerald-100/80 whitespace-pre-wrap mt-1 font-mono">
                {JSON.stringify(m.context, null, 2)}
              </pre>
              <div className="text-[10px] text-emerald-200/50 mt-1">
                {new Date(m.created_at).toLocaleString("ar")}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="👍 قرارات الشمس + تقييم">
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {(decisionsQ.data ?? []).length === 0 && (
            <div className="text-sm text-emerald-200/60">لا توجد قرارات من AI Sun Core بعد.</div>
          )}
          {(decisionsQ.data ?? []).map((d: any) => {
            const ratings: number[] = (d.feedback ?? []).map((f: any) => f.rating);
            const up = ratings.filter((r) => r > 0).length;
            const down = ratings.filter((r) => r < 0).length;
            return (
              <div
                key={d.id}
                className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-amber-300">{d.agent_name}</span>
                  <span className="text-xs text-emerald-200/60">
                    {new Date(d.created_at).toLocaleTimeString("ar")}
                  </span>
                </div>
                <div className="text-emerald-100/90 mt-1">
                  {d.decision_type} · ثقة {Math.round((Number(d.confidence) || 0) * 100)}%
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    disabled={fbMut.isPending}
                    onClick={() => fbMut.mutate({ decisionId: d.id, rating: 1 })}
                    className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    👍 {up}
                  </button>
                  <button
                    disabled={fbMut.isPending}
                    onClick={() => fbMut.mutate({ decisionId: d.id, rating: -1 })}
                    className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    👎 {down}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

/* ============================================================ */
/* Phase 2 — Neural (Vector) Memory Search                       */
/* ============================================================ */
function NeuralSearchSection() {
  const search = useServerFn(neuralSearch);
  const status = useServerFn(neuralStatus);
  const [query, setQuery] = useState("");
  const [ownerType, setOwnerType] = useState("");

  const statusQ = useQuery({
    queryKey: ["neural", "status"],
    queryFn: () => status(),
    refetchInterval: 60_000,
  });

  const searchMut = useMutation({
    mutationFn: (q: string) =>
      search({
        data: {
          query: q,
          limit: 10,
          ownerType: ownerType || undefined,
        },
      }),
  });

  return (
    <section className="grid grid-cols-1 gap-4">
      <Panel title="🧠 البحث الدلالي في الذاكرة العصبية (pgvector)">
        {statusQ.data && !statusQ.data.enabled && (
          <div className="mb-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
            الوضع الافتراضي: التخزين العصبي معطّل لتوفير رصيد التضمين. لتفعيل الحفظ التلقائي
            لكل قرار من عامل الشمس، اضبط المتغيّر <code>AI_NEURAL_ENABLE=1</code>. البحث يعمل الآن
            على أي إدخالات موجودة أصلاً.
          </div>
        )}
        {statusQ.data && (
          <div className="text-xs text-emerald-200/60 mb-3">
            الحالة: {statusQ.data.enabled ? "🟢 تخزين تلقائي مفعّل" : "⚪ تخزين تلقائي معطّل"} ·
            الذاكرات المخزّنة: {statusQ.data.total}
          </div>
        )}
        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim().length > 1) searchMut.mutate(query.trim());
            }}
            placeholder="ابحث دلالياً في ذاكرة الشمس..."
            className="flex-1 min-w-[240px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-emerald-200/40"
          />
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">كل المصادر</option>
            <option value="agent">agent</option>
            <option value="customer">customer</option>
            <option value="product">product</option>
            <option value="system">system</option>
          </select>
          <button
            onClick={() => query.trim().length > 1 && searchMut.mutate(query.trim())}
            disabled={searchMut.isPending || query.trim().length < 2}
            className="px-4 py-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 border border-amber-300 text-amber-50 text-sm disabled:opacity-50"
          >
            {searchMut.isPending ? "..." : "بحث"}
          </button>
        </div>
        {searchMut.data && !searchMut.data.ok && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg p-3 mb-3">
            {searchMut.data.error}
          </div>
        )}
        <div className="space-y-2">
          {searchMut.data?.ok && searchMut.data.hits.length === 0 && (
            <div className="text-sm text-emerald-200/60">لا نتائج.</div>
          )}
          {searchMut.data?.ok &&
            searchMut.data.hits.map((h) => (
              <div
                key={h.id}
                className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="text-amber-300 text-xs">{h.owner_type} · {h.memory_category}</span>
                  <span className="text-xs text-emerald-200/60">
                    تشابه {Math.round(h.similarity * 100)}%
                  </span>
                </div>
                <div className="text-emerald-100/90 mt-1">{h.content}</div>
                <div className="text-[10px] text-emerald-200/50 mt-1">
                  {new Date(h.created_at).toLocaleString("ar")}
                </div>
              </div>
            ))}
        </div>
      </Panel>
    </section>
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
