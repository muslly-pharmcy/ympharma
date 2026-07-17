import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { universeStats } from "@/lib/ai-universe.functions";

export const Route = createFileRoute("/_authenticated/admin-agent-universe")({
  head: () => ({
    meta: [
      { title: "🤖 Agent Universe — الكون الوكلائي" },
      {
        name: "description",
        content: "مراقبة وكلاء الذكاء الاصطناعي والأدوات والاتصالات مع العالم.",
      },
    ],
  }),
  component: UniversePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function UniversePage() {
  const fetchStats = useServerFn(universeStats);
  const q = useSuspenseQuery({
    queryKey: ["universe", "stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 20_000,
  });

  const { permissions, actions, world } = q.data;

  // Group permissions by agent
  const permsByAgent = new Map<string, string[]>();
  for (const p of permissions) {
    const list = permsByAgent.get(p.agent_name) ?? [];
    list.push(p.permission);
    permsByAgent.set(p.agent_name, list);
  }

  return (
    <div dir="rtl" className="p-6 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-teal-400">🌌 Agent Universe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          الوكلاء · الأدوات · اتصالات العالم — Phases 3, 4 & 5
        </p>
      </header>

      {/* Agents */}
      <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">👤 الوكلاء المسجّلون ({permsByAgent.size})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(permsByAgent.entries()).map(([agent, perms]) => (
            <div key={agent} className="rounded-md border border-teal-900/30 p-3 bg-slate-950/50">
              <div className="font-mono text-sm text-teal-300">{agent}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {perms.map((p) => (
                  <span key={p} className="text-xs bg-teal-900/30 text-teal-200 px-2 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* World */}
      <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">🌍 صحة الاتصال بالعالم</h2>
        {world.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم يتم تشغيل فحص الصحة بعد.</p>
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
                    <span
                      className={
                        w.status === "online"
                          ? "text-emerald-400"
                          : w.status === "degraded"
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      ● {w.status}
                    </span>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(w.checked_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Actions ledger */}
      <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
        <h2 className="text-xl font-semibold mb-4">🛠 آخر تنفيذات الأدوات ({actions.length})</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد أي تنفيذ حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-muted-foreground">
                <tr>
                  <th className="py-2">الوكيل</th>
                  <th>الأداة</th>
                  <th>الحالة</th>
                  <th>موافقة؟</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="border-t border-teal-900/20">
                    <td className="py-2 font-mono text-xs text-teal-300">{a.agent_name}</td>
                    <td className="font-mono text-xs">{a.tool_name}</td>
                    <td>
                      <span
                        className={
                          a.status === "completed"
                            ? "text-emerald-400"
                            : a.status === "pending_approval"
                              ? "text-amber-400"
                              : "text-red-400"
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>{a.requires_approval ? "نعم" : "—"}</td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
