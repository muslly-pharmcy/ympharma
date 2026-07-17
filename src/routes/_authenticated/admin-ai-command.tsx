import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getCommandCenterSnapshot } from "@/lib/command-center.functions";
import { GlassCard } from "@/components/futuristic/GlassCard";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin-ai-command")({
  head: () => ({
    meta: [
      { title: "🧠 AI Command Center — MUSLLY" },
      {
        name: "description",
        content:
          "مركز قيادة الذكاء الصناعي: حالة العقل، الوكلاء، الأحداث، القرارات، والتنبؤات — بيانات حية من قلب النظام.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AICommandCenterPage,
  errorComponent: ({ error }) => (
    <div dir="rtl" className="p-8 text-red-500">
      تعذر التحميل: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function AICommandCenterPage() {
  const fetchSnap = useServerFn(getCommandCenterSnapshot);
  const q = useSuspenseQuery({
    queryKey: ["ai-command-center"],
    queryFn: () => fetchSnap(),
    refetchInterval: 15_000,
  });

  const { brain, agents, world, events, decisions, runs, forecasts, expiries, counts } = q.data;

  return (
    <div dir="rtl" className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-teal-400">🧠 AI Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          مركز قيادة العقل الصناعي — يحدّث كل 15 ثانية
        </p>
      </header>

      {/* Brain status row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="حالة العقل"
          value={brain.orchestrator_status ?? "بلا نبض"}
          tone={
            brain.orchestrator_status === "online"
              ? "good"
              : brain.orchestrator_status === "degraded"
                ? "warn"
                : "bad"
          }
        />
        <StatCard label="أحداث معلّقة" value={String(counts.pending_events)} tone="info" />
        <StatCard
          label="موافقات معلّقة"
          value={String(counts.pending_approvals)}
          tone={counts.pending_approvals > 0 ? "warn" : "good"}
        />
        <StatCard
          label="قرارات (24س)"
          value={String(counts.decisions_last_24h)}
          tone="info"
        />
      </section>

      <p className="text-xs text-muted-foreground">
        آخر تشغيل للأوركسترا:{" "}
        {brain.last_orchestrator_run
          ? new Date(brain.last_orchestrator_run).toLocaleString("ar-EG")
          : "لم يُشغَّل بعد"}
      </p>

      {/* Agents grid */}
      <GlassCard className="p-5">
        <h2 className="font-semibold mb-3">🤖 الوكلاء ({agents.length})</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا يوجد وكلاء مسجّلون في قاعدة البيانات بعد. الوكلاء المُسجّلون في الكود يُدارون
            عبر <code>src/ai/agents/register.ts</code>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((a) => (
              <div
                key={a.code}
                className="rounded-md border border-teal-900/30 p-3 bg-slate-950/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-teal-300">{a.code}</span>
                  <HealthDot health={a.health} enabled={a.enabled} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.name} · {a.category ?? "—"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  آخر تشغيل:{" "}
                  {a.last_dispatched_at
                    ? new Date(a.last_dispatched_at).toLocaleString("ar-EG")
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Stream */}
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-3">⚡ Event Stream</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>
          ) : (
            <ul className="space-y-1.5 text-sm max-h-96 overflow-y-auto">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 border-b border-teal-900/20 py-1.5"
                >
                  <Badge variant="outline" className="text-[10px]">
                    {e.status}
                  </Badge>
                  <span className="font-mono text-xs">{e.event_type}</span>
                  <span className="text-[10px] text-muted-foreground">
                    من: {e.source}
                  </span>
                  <span className="text-[10px] text-muted-foreground mr-auto">
                    {new Date(e.created_at).toLocaleTimeString("ar-EG")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Decision Timeline */}
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-3">🎯 القرارات الأخيرة</h2>
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد قرارات بعد.</p>
          ) : (
            <ul className="space-y-1.5 text-sm max-h-96 overflow-y-auto">
              {decisions.map((d) => (
                <li key={d.id} className="border-b border-teal-900/20 py-1.5">
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-xs text-teal-300">{d.agent_name}</span>
                    {d.decision_type && (
                      <Badge variant="secondary" className="text-[10px]">
                        {d.decision_type}
                      </Badge>
                    )}
                    <span className="mr-auto text-[10px] text-muted-foreground">
                      ثقة:{" "}
                      {typeof d.confidence === "number"
                        ? `${(d.confidence * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleString("ar-EG")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Predictions / Forecasts */}
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-3">🔮 التنبؤات</h2>
          {forecasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تنبؤات محسوبة.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {forecasts.map((f) => (
                <li
                  key={`${f.product_id}-${f.horizon_days}`}
                  className="border-b border-teal-900/20 py-1.5"
                >
                  <span className="font-mono text-[10px]">
                    {f.product_id.slice(0, 8)}…
                  </span>{" "}
                  · +{f.horizon_days}ي:{" "}
                  <span className="text-teal-300">{Math.round(f.expected_units)}</span>{" "}
                  وحدة
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Expiry alerts */}
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-3">⏰ تنبيهات الصلاحية</h2>
          {expiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات نشطة.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {expiries.map((e) => (
                <li key={e.batch_id} className="border-b border-teal-900/20 py-1.5">
                  <Badge variant="destructive" className="text-[10px] ml-2">
                    {e.tier}
                  </Badge>
                  ينتهي: {e.expiry_date} · كمية: {e.qty_at_alert}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      {/* World health */}
      <GlassCard className="p-5">
        <h2 className="font-semibold mb-3">🌐 صحة الأنظمة</h2>
        {world.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تُشغَّل الفحوصات بعد.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-right text-muted-foreground">
              <tr>
                <th className="py-2">النظام</th>
                <th>الحالة</th>
                <th>آخر فحص</th>
              </tr>
            </thead>
            <tbody>
              {world.map((w) => (
                <tr key={w.system_name} className="border-t border-teal-900/20">
                  <td className="py-2 font-mono">{w.system_name}</td>
                  <td>
                    <HealthDot health={w.status} enabled />
                    <span className="mr-2">{w.status}</span>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(w.checked_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* Recent runs */}
      <GlassCard className="p-5">
        <h2 className="font-semibold mb-3">📜 آخر الدورات</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد دورات مسجّلة.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="border-b border-teal-900/20 py-1.5">
                <div className="flex gap-2 items-center">
                  <Badge
                    variant={r.status === "ok" ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {r.status}
                  </Badge>
                  <span className="font-mono text-xs">{r.agent}</span>
                  <span className="text-[10px] text-muted-foreground">{r.kind}</span>
                  <span className="mr-auto text-[10px] text-muted-foreground">
                    {r.execution_time_ms ?? 0}ms
                  </span>
                </div>
                {r.summary && (
                  <div className="text-[10px] text-muted-foreground truncate">{r.summary}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "info";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400 border-emerald-900/40"
      : tone === "warn"
        ? "text-amber-400 border-amber-900/40"
        : tone === "bad"
          ? "text-red-400 border-red-900/40"
          : "text-teal-300 border-teal-900/40";
  return (
    <div className={`rounded-lg border ${color} bg-slate-950/50 p-4`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function HealthDot({ health, enabled }: { health: string | null; enabled: boolean }) {
  const ok = enabled && (health === "online" || health === "healthy" || health === "ok");
  const warn = health === "degraded" || health === "warn";
  const cls = ok ? "bg-emerald-400" : warn ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}
